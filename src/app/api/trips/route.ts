import { z } from "zod";
import { SearchParamsSchema } from "@/lib/search-params";
import { json, rateLimited, readBody } from "@/lib/server";
import { tripsForDestination } from "@/lib/trip/load";

const Body = z.object({ params: SearchParamsSchema, destination: z.string().regex(/^[A-Z]{3}$/) });

/** Step 2: one destination → hotels for its best dates → complete trips. */
export async function POST(req: Request) {
  // One search fans out to one call per destination (up to ~60 with paging), so keep this generous.
  if (rateLimited(req, "trips", 240)) return json({ error: "rate_limited" }, 429);
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  return json(await tripsForDestination(body.data.params, body.data.destination));
}
