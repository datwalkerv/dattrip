import { z } from "zod";
import { searchFlights } from "@/lib/flights/search-engine";
import { hotelProvider } from "@/lib/hotels/search-engine";
import { SearchParamsSchema } from "@/lib/search-params";
import { json, rateLimited, readBody } from "@/lib/server";

const Body = z.object({ params: SearchParamsSchema, offset: z.number().int().min(0).max(500).default(0), limit: z.number().int().min(1).max(60).default(12) });

/** Step 1: flights only. Returns the cheapest destinations with their best date options. */
export async function POST(req: Request) {
  if (rateLimited(req, "search", 30)) return json({ error: "rate_limited" }, 429);
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  const { params, offset, limit } = body.data;
  const r = await searchFlights(params, { offset, limit });
  return json({ ...r, hotelsConfigured: hotelProvider.configured() });
}
