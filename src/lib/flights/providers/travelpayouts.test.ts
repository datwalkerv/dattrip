import { expect, test } from "vitest";
import { bestPerDatePair } from "../offer";
import { normalize } from "./travelpayouts";

const q = { origin: "BUD", departure: "2027-03", ret: "2027-03", direct: false, currency: "EUR", adults: 2, children: 1 };
// Shape documented for /aviasales/v3/prices_for_dates.
const good = { origin: "BUD", destination: "BCN", origin_airport: "BUD", destination_airport: "BCN", price: 41, airline: "W6", flight_number: "2375", departure_at: "2027-03-06T06:25:00+01:00", return_at: "2027-03-10T21:40:00+01:00", transfers: 0, return_transfers: 1, duration: 310, duration_to: 150, duration_back: 160, link: "/search/BUD0603BCN10031?t=x" };

test("normalizes fares, totals them for the party, and drops malformed rows", () => {
  const raw = { success: true, currency: "eur", data: [good, { ...good, price: "free" }, { ...good, departure_at: "soon" }, { ...good, return_at: undefined }, null] };
  const offers = normalize(raw, q, "2026-11-12T10:00:00Z", "12345");
  expect(offers).toHaveLength(1);
  const o = offers[0];
  expect(o).toMatchObject({ pricePerAdult: 41, totalPrice: 123, priceIsEstimate: true, travellers: 3, currency: "EUR", airline: "W6" });
  expect(o.outbound).toEqual({ from: "BUD", to: "BCN", departAt: "2027-03-06T06:25:00+01:00", durationMin: 150, stops: 0, flightNumber: "W6 2375" });
  expect(o.inbound).toMatchObject({ from: "BCN", to: "BUD", stops: 1, durationMin: 160 });
  expect(o.inbound!.flightNumber).toBeUndefined(); // provider gives no return flight number: not invented
  expect(o.bookingUrl).toBe("https://www.aviasales.com/search/BUD0603BCN100321?marker=12345");
});

test("a response of the wrong shape is an error, not an empty result", () => {
  expect(() => normalize({ error: "nope" }, q, "x")).toThrow(/unexpected/);
});

test("keeps the cheapest fare per date pair", () => {
  const offers = normalize({ data: [{ ...good, price: 60, airline: "FR" }, good, { ...good, price: 30, departure_at: "2027-03-07T06:25:00+01:00" }] }, { ...q, children: 0, adults: 1 }, "x");
  expect(bestPerDatePair(offers).map((o) => o.pricePerAdult)).toEqual([30, 41]);
});
