import type { FlightOffer } from "@/types/flight";

/** Pure helpers over FlightOffer: safe to import from client components. */

/** Date options kept per destination. */
export const OFFERS_PER_DESTINATION = 12;

export const depDate = (o: FlightOffer) => o.outbound.departAt.slice(0, 10);
export const retDate = (o: FlightOffer) => o.inbound?.departAt.slice(0, 10);
export const flightMinutes = (o: FlightOffer) => (o.outbound.durationMin ?? 0) + (o.inbound?.durationMin ?? 0);
export const flightStops = (o: FlightOffer) => o.outbound.stops + (o.inbound?.stops ?? 0);

/** Cheapest offer per distinct (departure, return) day pair, cheapest first. */
export function bestPerDatePair(offers: FlightOffer[], limit = OFFERS_PER_DESTINATION): FlightOffer[] {
  const seen = new Set<string>();
  const out: FlightOffer[] = [];
  for (const o of [...offers].sort((a, b) => a.totalPrice - b.totalPrice)) {
    const k = `${depDate(o)}|${retDate(o) ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(o);
    if (out.length === limit) break;
  }
  return out;
}

