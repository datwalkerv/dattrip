import { z } from "zod";
import { cached } from "@/lib/cache";
import { diffDays } from "@/lib/dates";
import { env } from "@/lib/env";
import { fetchJson, ProviderError } from "@/lib/errors";
import { haversineKm } from "@/lib/geo";
import type { HotelDetails, HotelOffer, HotelRate } from "@/types/hotel";
import type { HotelProvider, HotelQuery } from "./types";

const NAME = "liteapi";
const BASE = "https://api.liteapi.travel/v3.0";
/** Hotels priced per search; the best-reviewed ones within the radius go first. */
const MAX_HOTELS = 150;
// shortcut: rates need a nationality and children's ages the form doesn't ask for; add inputs if prices differ by market or age.
const GUEST_NATIONALITY = "HU";
const CHILD_AGE = 8;
/** LiteAPI property types left out by default: "Hostels" and "Hostel/Backpacker accommodation" (from GET /data/hotelTypes). */
const EXCLUDED_TYPE_IDS = new Set([203, 264]);
export const isExcludedType = (s: { hotelTypeId?: number | null }) => EXCLUDED_TYPE_IDS.has(s.hotelTypeId ?? -1);

const num = z.coerce.number();
const Static = z.object({
  id: z.string(),
  name: z.string(),
  latitude: num,
  longitude: num,
  address: z.string().nullish(),
  main_photo: z.string().nullish(),
  thumbnail: z.string().nullish(),
  stars: num.nullish(),
  hotelTypeId: num.nullish(),
  rating: num.nullish(),
  reviewCount: num.nullish(),
});
type Static = z.infer<typeof Static>;

const Money = z.object({ amount: z.number(), currency: z.string() });
const Rate = z.object({
  name: z.string().default(""),
  boardType: z.string().default(""),
  boardName: z.string().default(""),
  retailRate: z.object({
    total: z.array(Money).min(1),
    taxesAndFees: z.array(z.object({ included: z.boolean(), amount: z.number().nullish() })).nullish(),
  }),
  cancellationPolicies: z
    .object({
      refundableTag: z.string().nullish(),
      cancelPolicyInfos: z.array(z.object({ cancelTime: z.string().nullish() })).nullish(),
    })
    .nullish(),
});
const Offer = z.object({ offerId: z.string(), rates: z.array(Rate).min(1), offerRetailRate: Money.nullish() });
const RatesHotel = z.object({ hotelId: z.string(), roomTypes: z.array(z.unknown()) });

/** Board codes whose meal plan covers breakfast (BB, BI, half/full board, all inclusive, breakfast + lunch/dinner). */
export const hasBreakfast = (board: string) => /^(BB|BI|HB|FB|AI|TI|BD|BL)/i.test(board);

function toRate(raw: unknown): HotelRate | undefined {
  const r = Offer.safeParse(raw);
  if (!r.success) return undefined;
  const { offerId, rates, offerRetailRate } = r.data;
  const sum = (f: (x: (typeof rates)[number]) => number) => rates.reduce((s, x) => s + f(x), 0);
  const first = rates[0];
  const refundable = rates.every((x) => x.cancellationPolicies?.refundableTag === "RFN");
  // The earliest deadline across rooms is the last moment the whole booking can still be cancelled free.
  const deadlines = rates.map((x) => x.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime).filter((t): t is string => !!t);
  return {
    offerId,
    roomName: rates.length > 1 ? `${rates.length} rooms: ${first.name}` : first.name,
    boardCode: first.boardType,
    boardName: first.boardName,
    breakfastIncluded: rates.every((x) => hasBreakfast(x.boardType)),
    refundable,
    freeCancellationUntil: refundable ? deadlines.sort()[0] : undefined,
    total: offerRetailRate?.amount ?? sum((x) => x.retailRate.total[0].amount),
    payAtProperty: sum((x) => (x.retailRate.taxesAndFees ?? []).reduce((s, t) => s + (t.included ? 0 : (t.amount ?? 0)), 0)),
    currency: offerRetailRate?.currency ?? first.retailRate.total[0].currency,
  };
}

/** Joins priced offers with static hotel data. Hotels without a rating or coordinates are dropped: both are required to rank them. */
export function normalize(raw: unknown, statics: Map<string, Static>, q: HotelQuery, fetchedAt: string, bookingUrl: (id: string, breakfast: boolean) => string): HotelOffer[] {
  if (raw === null) return []; // 204: no availability
  const res = z.object({ data: z.array(z.unknown()) }).safeParse(raw);
  if (!res.success) throw new ProviderError(NAME, "upstream", "liteapi: unexpected rates response shape");
  const out: HotelOffer[] = [];
  for (const item of res.data.data) {
    const h = RatesHotel.safeParse(item);
    if (!h.success) continue;
    const s = statics.get(h.data.hotelId);
    if (!s || s.rating == null) continue;
    const rates = h.data.roomTypes.map(toRate).filter((r): r is HotelRate => !!r && r.total > 0);
    if (!rates.length) continue;
    const cheapest = (list: HotelRate[]) => list.reduce((a, b) => (b.total + b.payAtProperty < a.total + a.payAtProperty ? b : a));
    const withBreakfast = rates.filter((r) => r.breakfastIncluded);
    const breakfastRate = withBreakfast.length ? cheapest(withBreakfast) : undefined;
    out.push({
      id: s.id,
      provider: NAME,
      name: s.name,
      address: s.address ?? undefined,
      lat: s.latitude,
      lng: s.longitude,
      distanceKm: Math.round(haversineKm(q.lat, q.lng, s.latitude, s.longitude) * 10) / 10,
      rating: s.rating,
      reviewCount: s.reviewCount ?? 0,
      stars: s.stars ?? undefined,
      photo: s.main_photo ?? s.thumbnail ?? undefined,
      checkin: q.checkin,
      checkout: q.checkout,
      nights: diffDays(q.checkin, q.checkout),
      cheapestRate: cheapest(rates),
      breakfastRate,
      bookingUrl: bookingUrl(s.id, !!breakfastRate),
      fetchedAt,
    });
  }
  return out;
}

/** One room per two adults; children share the first room. */
export function occupancies(adults: number, children: number) {
  const rooms = Math.ceil(adults / 2);
  return Array.from({ length: rooms }, (_, i) => ({
    adults: Math.floor(adults / rooms) + (i < adults % rooms ? 1 : 0),
    children: i === 0 ? Array.from({ length: children }, () => CHILD_AGE) : [],
  }));
}

/** LiteAPI rate-limits bursts, so calls from this instance queue up two at a time and a 429 is retried after a pause. */
const MAX_CONCURRENT = 2;
let active = 0;
const waiting: (() => void)[] = [];
async function call(url: string, init: RequestInit): Promise<unknown> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  else active++;
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fetchJson(NAME, url, init);
      } catch (e) {
        if (!(e instanceof ProviderError) || e.code !== "rate_limited" || attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  } finally {
    // Hand the slot straight to the next caller, or free it.
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

function headers() {
  const key = env().LITEAPI_KEY;
  if (!key) throw new ProviderError(NAME, "not_configured");
  return { "X-API-Key": key, accept: "application/json", "content-type": "application/json" };
}

/** Static hotel list around a point: changes rarely, so it is cached for a day. */
function hotelsNear(q: HotelQuery): Promise<Static[]> {
  const params = new URLSearchParams({
    latitude: String(q.lat),
    longitude: String(q.lng),
    radius: String(Math.max(1000, Math.round(q.radiusKm * 1000))),
    minRating: String(q.minRating),
    limit: "1000",
  });
  return cached(`liteapi:hotels:v2:${params}`, 86_400, async () => {
    const raw = await call(`${BASE}/data/hotels?${params}`, { headers: headers() });
    const res = z.object({ data: z.array(z.unknown()) }).safeParse(raw);
    if (!res.success) return [];
    return res.data.data.flatMap((x) => {
      const r = Static.safeParse(x);
      return r.success ? [r.data] : [];
    });
  });
}

export const liteapi: HotelProvider = {
  name: NAME,
  configured: () => !!env().LITEAPI_KEY,

  async search(q) {
    const h = headers();
    const all = await hotelsNear(q);
    // The static filter is re-checked here: never trust the provider to have applied rating and distance.
    const eligible = all
      .filter((s) => !isExcludedType(s) && (s.rating ?? 0) >= q.minRating && haversineKm(q.lat, q.lng, s.latitude, s.longitude) <= q.radiusKm)
      .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
      .slice(0, MAX_HOTELS);
    if (!eligible.length) return [];
    const occ = occupancies(q.adults, q.children);
    const raw = await call(`${BASE}/hotels/rates`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        hotelIds: eligible.map((s) => s.id),
        occupancies: occ,
        currency: q.currency,
        guestNationality: GUEST_NATIONALITY,
        checkin: q.checkin,
        checkout: q.checkout,
        timeout: 8,
        // Cheapest-first, so a pricier breakfast rate can fall outside the cap; raise it if breakfast offers look sparse.
        maxRatesPerHotel: 15,
      }),
    });
    const wl = env().LITEAPI_WHITELABEL_DOMAIN;
    const occParam = encodeURIComponent(Buffer.from(JSON.stringify(occ)).toString("base64"));
    const url = (id: string, breakfast: boolean) =>
      wl ? `https://${wl}/hotels/${encodeURIComponent(id)}?checkin=${q.checkin}&checkout=${q.checkout}&occupancies=${occParam}${breakfast ? "&needBreakfast=1" : ""}` : "";
    return normalize(raw, new Map(eligible.map((s) => [s.id, s])), q, new Date().toISOString(), url);
  },

  details(id) {
    return cached(`liteapi:hotel:${id}`, 86_400, async () => {
      const raw = await call(`${BASE}/data/hotel?hotelId=${encodeURIComponent(id)}`, { headers: headers() });
      const r = z
        .object({
          data: z.object({
            hotelDescription: z.string().nullish(),
            address: z.string().nullish(),
            hotelImages: z.array(z.object({ url: z.string().nullish(), urlHd: z.string().nullish() })).nullish(),
          }),
        })
        .safeParse(raw);
      if (!r.success) return { id, images: [] } satisfies HotelDetails;
      const images = (r.data.data.hotelImages ?? []).map((i) => i.urlHd ?? i.url).filter((u): u is string => !!u?.startsWith("https://"));
      return { id, description: r.data.data.hotelDescription ?? undefined, address: r.data.data.address ?? undefined, images: images.slice(0, 12) };
    });
  },
};
