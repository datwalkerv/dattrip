import { cached } from "@/lib/cache";
import { CATALOGUE, catalogueByCountry, catalogueGet } from "@/lib/catalogue";
import { dateWindow, inWindow, providerQueries } from "@/lib/dates";
import { statusOf } from "@/lib/errors";
import { airlineNames, searchPlaces } from "@/lib/places";
import { pool } from "@/lib/pool";
import type { SearchParams } from "@/lib/search-params";
import type { FlightOffer } from "@/types/flight";
import type { Destination, DestinationFlights, ProviderStatus } from "@/types/trip";
import { travelpayouts } from "./providers/travelpayouts";
import type { FlightProvider, FlightQuery } from "./providers/types";
import { bestPerDatePair, depDate, flightStops, retDate } from "./offer";

/** Swap or add providers here; the rest of the app only sees FlightOffer. */
export const flightProvider: FlightProvider = travelpayouts;

const FLIGHT_TTL = 3600;
const CONCURRENCY = 4;
/** Hotels are only priced for this many of a destination's cheapest date options. */
export const HOTEL_DATE_PAIRS = 3;

function queryFlights(q: FlightQuery, fresh: boolean) {
  const key = `flights:${flightProvider.name}:${JSON.stringify(q)}`;
  return cached(key, FLIGHT_TTL, () => flightProvider.search(q), fresh);
}

/** Catalogue first; otherwise ask the places service so any city a user types still gets a name and centre. */
export async function resolveDestination(code: string): Promise<Destination | undefined> {
  const known = catalogueGet(code);
  if (known) return known;
  const places = await searchPlaces(code).catch(() => []);
  const hit = places.find((p) => p.code === code && p.lat !== undefined && p.lng !== undefined);
  if (!hit) return undefined;
  return { code, city: hit.type === "airport" ? (hit.cityName ?? hit.name) : hit.name, country: hit.countryName, countryCode: hit.countryCode, lat: hit.lat!, lng: hit.lng! };
}

export interface FlightSearchResult {
  results: DestinationFlights[];
  status: ProviderStatus;
  /** Provider calls that failed while others succeeded. */
  failedQueries: number;
  totalDestinations: number;
}

export async function searchFlights(p: SearchParams, opts: { offset?: number; limit?: number; fresh?: boolean; perDestination?: number } = {}): Promise<FlightSearchResult> {
  const { offset = 0, limit = 12, fresh = false, perDestination } = opts;
  const empty = (status: ProviderStatus): FlightSearchResult => ({ results: [], status, failedQueries: 0, totalDestinations: 0 });
  if (!flightProvider.configured()) return empty("not_configured");

  const window = dateWindow(p);
  if (window.depFrom > window.depTo) return empty("ok");

  // Explicit cities get their own query. Anywhere and whole countries use one open query per origin, filtered to the catalogue.
  const explicit = p.to.filter((t) => !t.startsWith("c:"));
  const countries = p.to.filter((t) => t.startsWith("c:")).map((t) => t.slice(2));
  const open = p.to.length === 0 || countries.length > 0;
  const allowedOpen = new Set((p.to.length === 0 ? CATALOGUE : countries.flatMap(catalogueByCountry)).map((d) => d.code));

  const base = { direct: p.direct, currency: p.currency, adults: p.adults, children: p.children };
  const queries: FlightQuery[] = [];
  for (const origin of p.from)
    for (const dates of providerQueries(window)) {
      for (const destination of explicit) queries.push({ ...base, origin, destination, ...dates });
      if (open) queries.push({ ...base, origin, ...dates });
    }

  const settled = await pool(queries, CONCURRENCY, (q) => queryFlights(q, fresh));
  const failures = settled.filter((s) => s.status === "rejected");
  if (failures.length === settled.length && settled.length > 0) return empty(statusOf((failures[0] as PromiseRejectedResult).reason));

  const byId = new Map<string, FlightOffer>();
  settled.forEach((s, i) => {
    if (s.status !== "fulfilled") return;
    const isOpen = !queries[i].destination;
    for (const o of s.value) {
      if (isOpen && !allowedOpen.has(o.destination)) continue;
      if (p.from.includes(o.destination)) continue;
      if (!inWindow(window, depDate(o), retDate(o))) continue;
      if (p.direct && flightStops(o) > 0) continue;
      if (p.maxBudget && o.totalPrice > p.maxBudget) continue;
      const prev = byId.get(o.id);
      if (!prev || o.totalPrice < prev.totalPrice) byId.set(o.id, o);
    }
  });

  const groups = new Map<string, FlightOffer[]>();
  for (const o of byId.values()) groups.set(o.destination, [...(groups.get(o.destination) ?? []), o]);
  const ranked = [...groups.entries()].map(([code, offers]) => ({ code, offers: bestPerDatePair(offers, perDestination) })).sort((a, b) => a.offers[0].totalPrice - b.offers[0].totalPrice);

  const names = await airlineNames();
  const results: DestinationFlights[] = [];
  for (const g of ranked.slice(offset, offset + limit)) {
    const destination = await resolveDestination(g.code);
    if (!destination) continue;
    results.push({ destination, offers: g.offers.map((o) => ({ ...o, airlineName: names[o.airline] })) });
  }
  return { results, status: "ok", failedQueries: failures.length, totalDestinations: ranked.length };
}
