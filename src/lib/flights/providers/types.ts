import type { FlightOffer } from "@/types/flight";

export interface FlightQuery {
  origin: string;
  /** Omitted = every destination the provider knows from this origin. */
  destination?: string;
  /** YYYY-MM-DD or YYYY-MM. */
  departure: string;
  /** Same formats; omitted = one-way. */
  ret?: string;
  direct: boolean;
  currency: string;
  adults: number;
  children: number;
}

/** Implement this to add a flight source (e.g. Duffel). Return internal types only. */
export interface FlightProvider {
  name: string;
  configured(): boolean;
  search(q: FlightQuery): Promise<FlightOffer[]>;
}
