import { depDate, retDate } from "@/lib/flights/offer";
import { cheapestHotel, rankHotels, rateCost, type HotelFilters } from "@/lib/hotels/ranking";
import type { FlightOffer } from "@/types/flight";
import type { HotelOffer, RankedHotel } from "@/types/hotel";
import type { Destination, Trip } from "@/types/trip";
import { encodeTripId, type TripRef } from "./id";

const round = (n: number) => Math.round(n * 100) / 100;

// shortcut: check-in is the outbound departure day because the provider gives no arrival time; overnight flights would need arrival dates.
export const stayDates = (f: FlightOffer) => ({ checkin: depDate(f), checkout: retDate(f)! });

export function buildTrip(destination: Destination, flight: FlightOffer, hotel: RankedHotel, adults: number, children: number): Trip {
  const total = round(flight.totalPrice + rateCost(hotel.rate));
  return {
    id: encodeTripId({
      o: flight.origin,
      d: flight.destination,
      dep: depDate(flight),
      ret: retDate(flight)!,
      al: flight.airline,
      h: hotel.id,
      b: hotel.rate.breakfastIncluded ? 1 : 0,
      a: adults,
      c: children,
      cur: flight.currency as TripRef["cur"],
    }),
    destination,
    flight,
    hotel,
    nights: hotel.nights,
    flightPrice: flight.totalPrice,
    hotelPrice: round(hotel.rate.total),
    extraCosts: round(hotel.rate.payAtProperty),
    total,
    perPerson: round(total / (adults + children)),
    currency: flight.currency,
  };
}

/**
 * Pairs each flight with the hotels priced for its dates: the top `perFlight` by dattrip's hotel order,
 * plus the outright cheapest stay so the cheapest total is never missed. Flights and hotels in different
 * currencies are not combined (both providers are asked for the same one).
 */
export function combine(destination: Destination, flights: FlightOffer[], hotelsFor: (f: FlightOffer) => HotelOffer[] | undefined, adults: number, children: number, filters?: HotelFilters, perFlight = 4): Trip[] {
  const trips = new Map<string, Trip>();
  for (const flight of flights) {
    const offers = hotelsFor(flight)?.filter((h) => h.cheapestRate.currency === flight.currency);
    if (!offers?.length) continue;
    const picks = rankHotels(offers, filters).slice(0, perFlight);
    const cheapest = cheapestHotel(offers, filters);
    if (cheapest) picks.push(cheapest);
    for (const hotel of picks) {
      const t = buildTrip(destination, flight, hotel, adults, children);
      if (!trips.has(t.id)) trips.set(t.id, t);
    }
  }
  return [...trips.values()];
}
