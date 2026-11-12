import type { Destination } from "@/types/trip";
import data from "./catalogue.json";

/** Curated destinations used for Anywhere searches, photos and city-centre coordinates. Extend catalogue.json to grow it. */
export const CATALOGUE = data as Destination[];

const byCode = new Map(CATALOGUE.map((d) => [d.code, d]));
export const catalogueGet = (code: string) => byCode.get(code);
export const catalogueByCountry = (countryCode: string) => CATALOGUE.filter((d) => d.countryCode === countryCode);
