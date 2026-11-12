import { expect, test } from "vitest";
import type { HotelOffer, HotelRate } from "@/types/hotel";
import { isExcludedType, normalize, occupancies } from "./providers/liteapi";
import { cheapestHotel, rankHotels } from "./ranking";

const q = { lat: 41.3874, lng: 2.1686, radiusKm: 3, minRating: 8, checkin: "2027-03-06", checkout: "2027-03-10", adults: 2, children: 0, currency: "EUR" };
const stat = (id: string, o: object = {}) => ({ id, name: `Hotel ${id}`, latitude: 41.39, longitude: 2.17, rating: 8.6, reviewCount: 1200, ...o });
const eur = (amount: number) => ({ amount, currency: "EUR" });
// Shape documented for POST /hotels/rates.
const offer = (id: string, board: string, total: number, o: { tag?: string; fee?: number } = {}) => ({
  offerId: id,
  rates: [
    {
      name: "Double Room",
      boardType: board,
      boardName: board === "RO" ? "Room Only" : "Breakfast Included",
      retailRate: { total: [eur(total)], taxesAndFees: [{ included: true, amount: 9 }, ...(o.fee ? [{ included: false, amount: o.fee }] : [])] },
      cancellationPolicies: { refundableTag: o.tag ?? "NRFN", cancelPolicyInfos: [{ cancelTime: "2027-03-01 12:00:00" }] },
    },
  ],
  offerRetailRate: eur(total),
});

test("keeps room-only and breakfast prices apart, adds pay-at-property fees, drops bad rows", () => {
  const raw = {
    data: [
      { hotelId: "a", roomTypes: [offer("a1", "RO", 300), offer("a2", "BI", 380, { tag: "RFN", fee: 20 }), { offerId: "broken" }] },
      { hotelId: "unknown", roomTypes: [offer("u1", "RO", 100)] },
      { hotelId: "norating", roomTypes: [offer("n1", "RO", 100)] },
      "garbage",
    ],
  };
  const statics = new Map([stat("a"), stat("norating", { rating: null })].map((s) => [s.id, s]));
  const out = normalize(raw, statics as never, q, "now", (id, b) => `https://wl/hotels/${id}${b ? "?needBreakfast=1" : ""}`);
  expect(out).toHaveLength(1);
  expect(out[0]).toMatchObject({ id: "a", nights: 4, rating: 8.6, reviewCount: 1200, bookingUrl: "https://wl/hotels/a?needBreakfast=1" });
  expect(out[0].distanceKm).toBeLessThan(1);
  expect(out[0].cheapestRate).toMatchObject({ total: 300, breakfastIncluded: false, refundable: false, payAtProperty: 0 });
  expect(out[0].breakfastRate).toMatchObject({ total: 380, breakfastIncluded: true, refundable: true, payAtProperty: 20, freeCancellationUntil: "2027-03-01 12:00:00" });
  expect(normalize(null, statics as never, q, "now", () => "")).toEqual([]);
});

test("hostels are excluded, hotels and untyped properties are kept", () => {
  expect([203, 264].map((hotelTypeId) => isExcludedType({ hotelTypeId }))).toEqual([true, true]);
  expect([204, 0, null, undefined].map((hotelTypeId) => isExcludedType({ hotelTypeId }))).toEqual([false, false, false, false]);
});

test("rooms: two adults per room, children in the first", () => {
  expect(occupancies(2, 1)).toEqual([{ adults: 2, children: [8] }]);
  expect(occupancies(5, 0).map((r) => r.adults)).toEqual([2, 2, 1]);
});

const rate = (total: number, breakfast: boolean): HotelRate => ({ offerId: "x", roomName: "r", boardCode: breakfast ? "BI" : "RO", boardName: "", breakfastIncluded: breakfast, refundable: false, total, payAtProperty: 0, currency: "EUR" });
const hotel = (id: string, o: Partial<HotelOffer> & { ro: number; bb?: number }): HotelOffer => ({
  id, provider: "t", name: id, lat: 0, lng: 0, distanceKm: 1, rating: 8.5, reviewCount: 100, checkin: "", checkout: "", nights: 4, bookingUrl: "", fetchedAt: "",
  cheapestRate: rate(o.ro, false), breakfastRate: o.bb ? rate(o.bb, true) : undefined, ...o,
});

test("ranking: limits first, then breakfast, then price, then reviews when prices are comparable", () => {
  const ranked = rankHotels([
    hotel("cheap-no-breakfast", { ro: 200 }),
    hotel("breakfast-pricey", { ro: 250, bb: 420 }),
    hotel("breakfast-few-reviews", { ro: 250, bb: 400, reviewCount: 50 }),
    hotel("breakfast-many-reviews", { ro: 250, bb: 405, reviewCount: 5000 }),
    hotel("low-rating", { ro: 100, bb: 110, rating: 7.9 }),
    hotel("too-far", { ro: 100, bb: 110, distanceKm: 3.4 }),
  ]);
  expect(ranked.map((h) => h.id)).toEqual(["breakfast-many-reviews", "breakfast-few-reviews", "breakfast-pricey", "cheap-no-breakfast"]);
  // A breakfast hotel is priced at its breakfast rate, never the cheaper room-only one.
  expect(ranked[0].rate).toMatchObject({ total: 405, breakfastIncluded: true });
  expect(ranked[0].reasons).toContain("Breakfast included in this price");
  expect(ranked[3].reasons).toContain("No breakfast-inclusive rate found");
});

test("cheapest stay ignores breakfast but not the limits", () => {
  const c = cheapestHotel([hotel("a", { ro: 200, bb: 210 }), hotel("b", { ro: 150 }), hotel("bad", { ro: 50, rating: 6 })]);
  expect(c).toMatchObject({ id: "b", rate: { total: 150 } });
  expect(cheapestHotel([hotel("bad", { ro: 50, rating: 6 })])).toBeUndefined();
});
