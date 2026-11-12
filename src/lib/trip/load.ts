import { statusOf } from "@/lib/errors";
import { HOTEL_DATE_PAIRS, resolveDestination, searchFlights } from "@/lib/flights/search-engine";
import { hotelProvider, searchHotels } from "@/lib/hotels/search-engine";
import { pool } from "@/lib/pool";
import { SearchParamsSchema, type SearchParams } from "@/lib/search-params";
import type { FlightOffer } from "@/types/flight";
import type { HotelOffer } from "@/types/hotel";
import type { Destination, ProviderStatus, Trip } from "@/types/trip";
import { buildTrip, combine, stayDates } from "./combinations";
import type { TripRef } from "./id";
import { cheapestHotel, rankHotels } from "@/lib/hotels/ranking";

export interface DestinationTrips {
  destination?: Destination;
  flights: FlightOffer[];
  trips: Trip[];
  flightStatus: ProviderStatus;
  hotelStatus: ProviderStatus;
}

/** Step 2 of a search: every date option for one destination, hotels priced for the most promising ones, combined. */
export async function tripsForDestination(p: SearchParams, code: string): Promise<DestinationTrips> {
  const found = await searchFlights({ ...p, to: [code] }, { limit: 1 });
  const hit = found.results[0];
  const out: DestinationTrips = { destination: hit?.destination, flights: hit?.offers ?? [], trips: [], flightStatus: found.status, hotelStatus: "ok" };
  if (!hit || p.tripType === "oneway") return out;
  if (!hotelProvider.configured()) return { ...out, hotelStatus: "not_configured" };

  const priced = hit.offers.slice(0, HOTEL_DATE_PAIRS);
  const key = (f: FlightOffer) => Object.values(stayDates(f)).join("|");
  const stays = [...new Map(priced.map((f) => [key(f), stayDates(f)])).values()];
  const settled = await pool(stays, 3, (s) => searchHotels({ destination: hit.destination, ...s, adults: p.adults, children: p.children, currency: p.currency }));
  const hotels = new Map<string, HotelOffer[]>();
  settled.forEach((s, i) => s.status === "fulfilled" && hotels.set(Object.values(stays[i]).join("|"), s.value));
  const failed = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
  if (!hotels.size && failed) return { ...out, hotelStatus: statusOf(failed.reason) };

  let trips = combine(hit.destination, priced, (f) => hotels.get(key(f)), p.adults, p.children);
  if (p.maxBudget) trips = trips.filter((t) => t.total <= p.maxBudget!);
  return { ...out, trips };
}

export interface LoadedTrip {
  ref: TripRef;
  destination?: Destination;
  trip?: Trip;
  /** What could not be found again, if anything. */
  missing?: "destination" | "flight" | "hotel";
  flightStatus: ProviderStatus;
  hotelStatus: ProviderStatus;
  /** Other fares for the same route and dates. */
  flights: FlightOffer[];
  /** Other eligible hotels for the same dates, in dattrip's order. */
  hotels: Trip[];
}

export const refParams = (ref: TripRef): SearchParams =>
  SearchParamsSchema.parse({ from: [ref.o], to: [ref.d], dateMode: "exact", depart: ref.dep, ret: ref.ret, adults: ref.a, children: ref.c, currency: ref.cur });

/** Rebuilds a trip from its id with current provider data. `fresh` skips dattrip's cache (used before booking). */
export async function loadTrip(ref: TripRef, fresh = false): Promise<LoadedTrip> {
  const base: LoadedTrip = { ref, flightStatus: "ok", hotelStatus: "ok", flights: [], hotels: [] };
  const destination = await resolveDestination(ref.d);
  if (!destination) return { ...base, missing: "destination" };

  const stay = { destination, checkin: ref.dep, checkout: ref.ret, adults: ref.a, children: ref.c, currency: ref.cur };
  const [flightRes, hotelRes] = await Promise.allSettled([searchFlights(refParams(ref), { limit: 1, fresh }), hotelProvider.configured() ? searchHotels(stay, fresh) : Promise.reject("not_configured")]);

  const flightStatus = flightRes.status === "fulfilled" ? flightRes.value.status : "error";
  const hotelStatus: ProviderStatus = hotelRes.status === "fulfilled" ? "ok" : hotelRes.reason === "not_configured" ? "not_configured" : statusOf(hotelRes.reason);
  // searchFlights keeps one fare per date pair, so for exact dates this is the cheapest current fare for the route.
  const flights = flightRes.status === "fulfilled" ? (flightRes.value.results[0]?.offers ?? []) : [];
  const flight = flights.find((f) => f.airline === ref.al) ?? flights[0];
  const out = { ...base, destination, flightStatus, hotelStatus, flights };
  if (!flight) return { ...out, missing: "flight" };

  const offers = hotelRes.status === "fulfilled" ? hotelRes.value.filter((h) => h.cheapestRate.currency === flight.currency) : [];
  const ranked = rankHotels(offers);
  const cheapest = cheapestHotel(offers);
  const hotels = [...ranked.slice(0, 6), ...(cheapest ? [cheapest] : [])].map((h) => buildTrip(destination, flight, h, ref.a, ref.c));
  const offer = offers.find((h) => h.id === ref.h);
  if (!offer) return { ...out, hotels, missing: "hotel" };
  const rate = (ref.b ? offer.breakfastRate : offer.cheapestRate) ?? offer.cheapestRate;
  const picked = ranked.find((h) => h.id === ref.h && h.rate === rate) ?? (cheapest?.id === ref.h && cheapest.rate === rate ? cheapest : { ...offer, rate, reasons: ranked.find((h) => h.id === ref.h)?.reasons ?? [] });
  const trip = buildTrip(destination, flight, picked, ref.a, ref.c);
  return { ...out, trip, hotels: hotels.filter((t) => t.id !== trip.id) };
}
