import type { HotelOffer, HotelRate, RankedHotel } from "@/types/hotel";

export interface HotelFilters {
  minRating: number;
  maxDistanceKm: number;
}
export const DEFAULT_HOTEL_FILTERS: HotelFilters = { minRating: 8, maxDistanceKm: 3 };

/** Totals closer than this count as "comparable", and the better-reviewed hotel wins. */
const COMPARABLE = 0.03;

export const rateCost = (r: HotelRate) => r.total + r.payAtProperty;

function reasons(h: HotelOffer, rate: HotelRate): string[] {
  const out = [`Rated ${h.rating.toFixed(1)}/10${h.reviewCount ? ` from ${h.reviewCount.toLocaleString("en")} reviews` : ""}`, `${h.distanceKm.toFixed(1)} km from the centre`];
  out.push(rate.breakfastIncluded ? "Breakfast included in this price" : "No breakfast-inclusive rate found");
  if (rate.refundable) out.push("Free cancellation");
  return out;
}

const withRate = (h: HotelOffer, rate: HotelRate): RankedHotel => ({ ...h, rate, reasons: reasons(h, rate) });

/**
 * dattrip's hotel order:
 * 1. must meet the rating and distance limits,
 * 2. breakfast-inclusive rates first (priced at the breakfast rate, never the room-only one),
 * 3. lowest total for the stay,
 * 4. more reviews when totals are within 3%.
 */
export function rankHotels(offers: HotelOffer[], f: HotelFilters = DEFAULT_HOTEL_FILTERS): RankedHotel[] {
  const ranked = offers.filter((h) => h.rating >= f.minRating && h.distanceKm <= f.maxDistanceKm).map((h) => withRate(h, h.breakfastRate ?? h.cheapestRate));
  return ranked.sort((a, b) => {
    if (a.rate.breakfastIncluded !== b.rate.breakfastIncluded) return a.rate.breakfastIncluded ? -1 : 1;
    const ca = rateCost(a.rate);
    const cb = rateCost(b.rate);
    if (Math.abs(ca - cb) > COMPARABLE * Math.min(ca, cb)) return ca - cb;
    return b.reviewCount - a.reviewCount || ca - cb;
  });
}

/** The single lowest-priced eligible stay, breakfast or not. Needed so "Cheapest" is really the cheapest. */
export function cheapestHotel(offers: HotelOffer[], f: HotelFilters = DEFAULT_HOTEL_FILTERS): RankedHotel | undefined {
  const eligible = offers.filter((h) => h.rating >= f.minRating && h.distanceKm <= f.maxDistanceKm);
  if (!eligible.length) return undefined;
  const best = eligible.reduce((a, b) => (rateCost(b.cheapestRate) < rateCost(a.cheapestRate) ? b : a));
  return withRate(best, best.cheapestRate);
}
