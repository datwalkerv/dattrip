import { cached } from "@/lib/cache";
import type { HotelOffer } from "@/types/hotel";
import type { Destination } from "@/types/trip";
import { liteapi } from "./providers/liteapi";
import type { HotelProvider, HotelQuery } from "./providers/types";
import { DEFAULT_HOTEL_FILTERS } from "./ranking";

/** Swap or add providers here; the rest of the app only sees HotelOffer. */
export const hotelProvider: HotelProvider = liteapi;

const HOTEL_TTL = 900;

export interface StayQuery {
  destination: Destination;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  currency: string;
}

/** Priced hotels within the default rating and distance limits. Unranked: see ranking.ts. */
export function searchHotels(s: StayQuery, fresh = false): Promise<HotelOffer[]> {
  const q: HotelQuery = {
    lat: s.destination.lat,
    lng: s.destination.lng,
    radiusKm: DEFAULT_HOTEL_FILTERS.maxDistanceKm,
    minRating: DEFAULT_HOTEL_FILTERS.minRating,
    checkin: s.checkin,
    checkout: s.checkout,
    adults: s.adults,
    children: s.children,
    currency: s.currency,
  };
  return cached(`hotels:${hotelProvider.name}:${JSON.stringify(q)}`, HOTEL_TTL, () => hotelProvider.search(q), fresh);
}
