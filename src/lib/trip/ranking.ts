import { flightMinutes, flightStops } from "@/lib/flights/offer";
import type { Trip, TripLabel, TripSort } from "@/types/trip";

/** Best-value weights; they sum to 1. Price dominates, the rest break near-ties in favour of the nicer trip. */
export const VALUE_WEIGHTS = { price: 0.5, rating: 0.2, breakfast: 0.1, duration: 0.1, direct: 0.1 };

const byConvenience = (a: Trip, b: Trip) =>
  flightStops(a.flight) - flightStops(b.flight) || flightMinutes(a.flight) - flightMinutes(b.flight) || a.hotel.distanceKm - b.hotel.distanceKm || a.total - b.total;

/** 0..1, higher is better; relative to the trips being compared. */
export function valueScores(trips: Trip[]): Map<string, number> {
  const range = (xs: number[]) => {
    const lo = Math.min(...xs);
    const span = Math.max(...xs) - lo;
    return (x: number) => (span ? (x - lo) / span : 0);
  };
  const price = range(trips.map((t) => t.total));
  const dur = range(trips.map((t) => flightMinutes(t.flight)));
  const w = VALUE_WEIGHTS;
  return new Map(
    trips.map((t) => [
      t.id,
      w.price * (1 - price(t.total)) +
        w.rating * Math.min(1, Math.max(0, (t.hotel.rating - 8) / 2)) +
        w.breakfast * (t.hotel.rate.breakfastIncluded ? 1 : 0) +
        w.duration * (1 - dur(flightMinutes(t.flight))) +
        w.direct * (flightStops(t.flight) === 0 ? 1 : 0),
    ]),
  );
}

export function sortTrips(trips: Trip[], sort: TripSort): Trip[] {
  if (sort === "cheapest") return [...trips].sort((a, b) => a.total - b.total);
  if (sort === "convenient") return [...trips].sort(byConvenience);
  const s = valueScores(trips);
  return [...trips].sort((a, b) => s.get(b.id)! - s.get(a.id)! || a.total - b.total);
}

/** Labels are earned against the trips passed in, so only call this with everything that was actually priced. */
export function labelTrips(trips: Trip[]): Map<string, TripLabel[]> {
  const out = new Map<string, TripLabel[]>();
  if (trips.length < 2) return out;
  const add = (t: Trip, l: TripLabel) => out.set(t.id, [...(out.get(t.id) ?? []), l]);
  add(sortTrips(trips, "cheapest")[0], "Cheapest");
  add(sortTrips(trips, "value")[0], "Best value");
  add(sortTrips(trips, "convenient")[0], "Most convenient");
  return out;
}

/** The best trip per destination under `sort`, in that order. */
export function bestPerDestination(trips: Trip[], sort: TripSort): Trip[] {
  const seen = new Set<string>();
  return sortTrips(trips, sort).filter((t) => !seen.has(t.destination.code) && seen.add(t.destination.code));
}
