import { z } from "zod";
import type { Place } from "@/types/flight";
import { cached } from "./cache";
import { fetchJson } from "./errors";

const Item = z.object({
  type: z.enum(["city", "airport", "country"]),
  code: z.string().min(2).max(3),
  name: z.string(),
  country_code: z.string().nullish(),
  country_name: z.string().nullish(),
  city_name: z.string().nullish(),
  coordinates: z.object({ lat: z.number(), lon: z.number() }).nullish(),
});

/** City / airport / country autocomplete (Travelpayouts public endpoint, no key needed). */
export function searchPlaces(term: string, types: Place["type"][] = ["city", "airport"]): Promise<Place[]> {
  const q = term.trim().toLowerCase().slice(0, 40);
  if (q.length < 2) return Promise.resolve([]);
  const params = new URLSearchParams({ term: q, locale: "en" });
  for (const t of types) params.append("types[]", t);
  return cached(`places:${params}`, 86_400, async () => {
    const raw = await fetchJson("places", `https://autocomplete.travelpayouts.com/places2?${params}`);
    const out: Place[] = [];
    for (const item of Array.isArray(raw) ? raw : []) {
      const r = Item.safeParse(item);
      if (!r.success) continue;
      const p = r.data;
      out.push({
        code: p.code,
        type: p.type,
        name: p.name,
        cityName: p.city_name ?? undefined,
        countryCode: p.type === "country" ? p.code : (p.country_code ?? ""),
        countryName: p.type === "country" ? p.name : (p.country_name ?? ""),
        lat: p.coordinates?.lat,
        lng: p.coordinates?.lon,
      });
    }
    return out.slice(0, 10);
  });
}

const Airline = z.object({ code: z.string().nullish(), name_translations: z.object({ en: z.string().nullish() }).nullish(), name: z.string().nullish() });

/** IATA airline code → name. Missing names stay missing; the UI falls back to the code. */
export function airlineNames(): Promise<Record<string, string>> {
  return cached("airlines", 7 * 86_400, async () => {
    const raw = await fetchJson("airlines", "https://api.travelpayouts.com/data/en/airlines.json");
    const out: Record<string, string> = {};
    for (const item of Array.isArray(raw) ? raw : []) {
      const r = Airline.safeParse(item);
      const name = r.success ? (r.data.name_translations?.en ?? r.data.name) : undefined;
      if (r.success && r.data.code && name) out[r.data.code] = name;
    }
    return out;
  }).catch(() => ({}));
}
