import type { HotelDetails, HotelOffer } from "@/types/hotel";

export interface HotelQuery {
  /** City centre; distance is measured from here. */
  lat: number;
  lng: number;
  radiusKm: number;
  minRating: number;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  currency: string;
}

/** Implement this to add a hotel source (e.g. Booking.com Demand API). Return internal types only. */
export interface HotelProvider {
  name: string;
  configured(): boolean;
  search(q: HotelQuery): Promise<HotelOffer[]>;
  details(id: string): Promise<HotelDetails>;
}
