export interface Place {
  code: string;
  type: "city" | "airport" | "country";
  name: string;
  cityName?: string;
  countryCode: string;
  countryName: string;
  lat?: number;
  lng?: number;
}

/** One direction of a journey. Fields the provider doesn't return stay undefined; the UI never fills them in. */
export interface FlightLeg {
  from: string;
  to: string;
  /** ISO timestamp with the departure airport's local offset. */
  departAt: string;
  durationMin?: number;
  stops: number;
  flightNumber?: string;
}

export interface FlightOffer {
  id: string;
  provider: string;
  /** Code the search was made with (city or airport). */
  origin: string;
  destination: string;
  airline: string;
  airlineName?: string;
  outbound: FlightLeg;
  inbound?: FlightLeg;
  pricePerAdult: number;
  /** pricePerAdult × travellers when the provider only knows single-adult fares. */
  totalPrice: number;
  priceIsEstimate: boolean;
  travellers: number;
  currency: string;
  bookingUrl: string;
  /** When the provider saw this fare, if it says. */
  foundAt?: string;
  /** When dattrip fetched it. */
  fetchedAt: string;
}
