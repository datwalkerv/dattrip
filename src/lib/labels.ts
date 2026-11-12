import { CATALOGUE, catalogueGet } from "./catalogue";

const countryNames = new Map(CATALOGUE.map((d) => [d.countryCode, d.country]));

/** Human label for a code stored in the URL ("BCN", "c:ES"). Unknown codes show as themselves. */
export function labelFor(code: string) {
  if (code.startsWith("c:")) return countryNames.get(code.slice(2)) ?? code.slice(2);
  const d = catalogueGet(code);
  return d ? `${d.city} (${code})` : code;
}
