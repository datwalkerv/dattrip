import { statusOf } from "@/lib/errors";
import { searchPlaces } from "@/lib/places";
import { json } from "@/lib/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const term = url.searchParams.get("q") ?? "";
  const withCountries = url.searchParams.get("countries") === "1";
  try {
    return json({ places: await searchPlaces(term, withCountries ? ["city", "airport", "country"] : ["city", "airport"]) });
  } catch (e) {
    return json({ places: [], error: statusOf(e) }, 502);
  }
}
