import type { FlightOffer } from "./flight";
import type { RankedHotel } from "./hotel";

export interface Destination {
  code: string;
  city: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  tags?: string[];
  photo?: string;
  photoCredit?: { name: string; url: string };
}

export interface Trip {
  id: string;
  destination: Destination;
  flight: FlightOffer;
  hotel: RankedHotel;
  nights: number;
  flightPrice: number;
  hotelPrice: number;
  /** Mandatory costs not in the two prices above (e.g. city tax paid at the hotel). */
  extraCosts: number;
  total: number;
  perPerson: number;
  currency: string;
}

export type TripSort = "cheapest" | "value" | "convenient";
export type TripLabel = "Cheapest" | "Best value" | "Most convenient";

/** Step-1 result: one destination with its promising flights. */
export interface DestinationFlights {
  destination: Destination;
  offers: FlightOffer[];
}

export type ProviderStatus = "ok" | "not_configured" | "rate_limited" | "error";
