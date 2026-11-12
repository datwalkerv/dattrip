import { z } from "zod";
import { env } from "@/lib/env";
import { fetchJson, ProviderError } from "@/lib/errors";
import type { FlightOffer } from "@/types/flight";
import type { FlightProvider, FlightQuery } from "./types";

const NAME = "travelpayouts";

/** One row of /aviasales/v3/prices_for_dates. Fares are cached from real searches and priced for one adult. */
const Row = z.object({
  origin: z.string(),
  destination: z.string(),
  origin_airport: z.string().optional(),
  destination_airport: z.string().optional(),
  price: z.number().positive(),
  airline: z.string(),
  flight_number: z.union([z.string(), z.number()]).optional(),
  departure_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  return_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T/).optional(),
  transfers: z.number().int().nonnegative(),
  return_transfers: z.number().int().nonnegative().optional(),
  duration_to: z.number().positive().optional(),
  duration_back: z.number().positive().optional(),
  link: z.string().optional(),
  found_at: z.string().optional(),
});
const Response = z.object({ success: z.boolean().optional(), data: z.array(z.unknown()), currency: z.string().optional() });

const ddmm = (iso: string) => iso.slice(8, 10) + iso.slice(5, 7);

/** Aviasales search link for the whole party (the provider's own `link` is always for one adult). */
function bookingUrl(row: z.infer<typeof Row>, q: FlightQuery, marker?: string) {
  const pax = `${q.adults}${q.children || ""}`;
  const path = `${row.origin}${ddmm(row.departure_at)}${row.destination}${row.return_at ? ddmm(row.return_at) : ""}${pax}`;
  return `https://www.aviasales.com/search/${path}${marker ? `?marker=${encodeURIComponent(marker)}` : ""}`;
}

export function normalize(raw: unknown, q: FlightQuery, fetchedAt: string, marker?: string): FlightOffer[] {
  const res = Response.safeParse(raw);
  if (!res.success) throw new ProviderError(NAME, "upstream", "travelpayouts: unexpected response shape");
  const n = q.adults + q.children;
  const offers: FlightOffer[] = [];
  for (const item of res.data.data) {
    const r = Row.safeParse(item);
    if (!r.success) continue; // a malformed fare is dropped, never patched up
    const row = r.data;
    if (q.ret && !row.return_at) continue;
    const from = row.origin_airport ?? row.origin;
    const to = row.destination_airport ?? row.destination;
    const fn = row.flight_number === undefined ? undefined : `${row.airline} ${row.flight_number}`;
    offers.push({
      id: [row.origin, row.destination, row.departure_at, row.return_at ?? "", row.airline, row.flight_number ?? ""].join("|"),
      provider: NAME,
      origin: row.origin,
      destination: row.destination,
      airline: row.airline,
      outbound: { from, to, departAt: row.departure_at, durationMin: row.duration_to, stops: row.transfers, flightNumber: fn },
      inbound: row.return_at ? { from: to, to: from, departAt: row.return_at, durationMin: row.duration_back, stops: row.return_transfers ?? 0 } : undefined,
      pricePerAdult: row.price,
      totalPrice: Math.round(row.price * n * 100) / 100,
      priceIsEstimate: n > 1,
      travellers: n,
      currency: (res.data.currency ?? q.currency).toUpperCase(),
      bookingUrl: bookingUrl(row, q, marker),
      foundAt: row.found_at,
      fetchedAt,
    });
  }
  return offers;
}

export const travelpayouts: FlightProvider = {
  name: NAME,
  configured: () => !!env().TRAVELPAYOUTS_TOKEN,
  async search(q) {
    const { TRAVELPAYOUTS_TOKEN: token, TRAVELPAYOUTS_MARKER: marker } = env();
    if (!token) throw new ProviderError(NAME, "not_configured");
    const params = new URLSearchParams({
      origin: q.origin,
      departure_at: q.departure,
      one_way: q.ret ? "false" : "true",
      direct: String(q.direct),
      currency: q.currency.toLowerCase(),
      sorting: "price",
      unique: "false",
      limit: "1000",
    });
    if (q.destination) params.set("destination", q.destination);
    if (q.ret) params.set("return_at", q.ret);
    const raw = await fetchJson(NAME, `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`, { headers: { "X-Access-Token": token } });
    return normalize(raw, q, new Date().toISOString(), marker);
  },
};
