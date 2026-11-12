import { expect, test } from "vitest";
import type { FlightOffer } from "@/types/flight";
import type { HotelOffer, HotelRate } from "@/types/hotel";
import type { Destination } from "@/types/trip";
import { combine } from "./combinations";
import { decodeTripId } from "./id";
import { bestPerDestination, labelTrips, sortTrips } from "./ranking";

const dest = (code: string): Destination => ({ code, city: code, country: "X", countryCode: "XX", lat: 0, lng: 0 });
const flight = (d: string, price: number, o: { dep?: string; stops?: number; min?: number } = {}): FlightOffer => {
  const dep = o.dep ?? "2027-03-06";
  return {
    id: `${d}${dep}${price}`, provider: "t", origin: "BUD", destination: d, airline: "W6",
    outbound: { from: "BUD", to: d, departAt: `${dep}T06:00:00+01:00`, durationMin: o.min ?? 120, stops: o.stops ?? 0 },
    inbound: { from: d, to: "BUD", departAt: "2027-03-10T20:00:00+01:00", durationMin: o.min ?? 120, stops: 0 },
    pricePerAdult: price / 2, totalPrice: price, priceIsEstimate: true, travellers: 2, currency: "EUR", bookingUrl: "", fetchedAt: "",
  };
};
const rate = (total: number, breakfast: boolean, fee = 0): HotelRate => ({ offerId: "x", roomName: "r", boardCode: "", boardName: "", breakfastIncluded: breakfast, refundable: false, total, payAtProperty: fee, currency: "EUR" });
const hotel = (id: string, ro: number, bb?: number, o: Partial<HotelOffer> = {}): HotelOffer => ({
  id, provider: "t", name: id, lat: 0, lng: 0, distanceKm: 1, rating: 8.5, reviewCount: 100, checkin: "", checkout: "", nights: 4, bookingUrl: "", fetchedAt: "",
  cheapestRate: rate(ro, false), breakfastRate: bb ? rate(bb, true) : undefined, ...o,
});

test("totals add flights, hotel and pay-at-property fees; the id decodes back", () => {
  const h = hotel("h1", 300, undefined, { cheapestRate: rate(300, false, 24) });
  const [t] = combine(dest("BCN"), [flight("BCN", 100)], () => [h], 2, 0);
  expect(t).toMatchObject({ flightPrice: 100, hotelPrice: 300, extraCosts: 24, total: 424, perPerson: 212, nights: 4 });
  expect(decodeTripId(t.id)).toEqual({ o: "BUD", d: "BCN", dep: "2027-03-06", ret: "2027-03-10", al: "W6", h: "h1", b: 0, a: 2, c: 0, cur: "EUR" });
  expect(decodeTripId("not-an-id")).toBeUndefined();
  expect(decodeTripId(Buffer.from('{"o":"../etc"}').toString("base64url"))).toBeUndefined();
});

test("the cheapest outbound flight does not decide the cheapest trip", () => {
  // The dearer flight lands on dates with a much cheaper hotel.
  const cheapFlight = flight("BCN", 80, { dep: "2027-03-05" });
  const dearFlight = flight("BCN", 120, { dep: "2027-03-06" });
  const trips = combine(dest("BCN"), [cheapFlight, dearFlight], (f) => (f === cheapFlight ? [hotel("peak", 500)] : [hotel("quiet", 300)]), 2, 0);
  expect(sortTrips(trips, "cheapest")[0]).toMatchObject({ total: 420, flightPrice: 120 });
});

test("breakfast-first picks are offered, but Cheapest is the real minimum", () => {
  const trips = combine(dest("BCN"), [flight("BCN", 100)], () => [hotel("bb", 320, 400), hotel("plain", 250)], 2, 0);
  expect(trips.map((t) => t.total).sort()).toEqual([350, 500]);
  const labels = labelTrips(trips);
  const cheapest = trips.find((t) => labels.get(t.id)?.includes("Cheapest"))!;
  expect(cheapest.total).toBe(350);
  expect(cheapest.hotel.rate.breakfastIncluded).toBe(false);
});

test("labels and sorts: convenient prefers direct and short, value balances, single results get no label", () => {
  const a = combine(dest("AAA"), [flight("AAA", 100, { stops: 1, min: 400 })], () => [hotel("a", 200)], 2, 0);
  const b = combine(dest("BBB"), [flight("BBB", 140, { min: 90 })], () => [hotel("b", 170, 175, { rating: 9.4 })], 2, 0);
  const c = combine(dest("CCC"), [flight("CCC", 400, { min: 80 })], () => [hotel("c", 400)], 2, 0);
  const all = [...a, ...b, ...c];
  expect(sortTrips(all, "cheapest")[0].destination.code).toBe("AAA");
  expect(sortTrips(all, "convenient")[0].destination.code).toBe("CCC");
  expect(sortTrips(all, "value")[0].destination.code).toBe("BBB");
  expect(bestPerDestination(all, "cheapest").map((t) => t.destination.code)).toEqual(["AAA", "BBB", "CCC"]);
  expect(labelTrips(a).size).toBe(0);
  expect([...labelTrips(all).values()].flat().sort()).toEqual(["Best value", "Cheapest", "Most convenient"]);
});

test("mixed currencies are never added together", () => {
  const usd = hotel("usd", 100, undefined, { cheapestRate: { ...rate(100, false), currency: "USD" } });
  expect(combine(dest("BCN"), [flight("BCN", 100)], () => [usd], 2, 0)).toEqual([]);
});
