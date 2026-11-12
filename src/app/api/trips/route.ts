import { z } from "zod";
import { SearchParamsSchema } from "@/lib/search-params";
import { json, readBody } from "@/lib/server";
import { tripsForDestination } from "@/lib/trip/load";

const Body = z.object({ params: SearchParamsSchema, destination: z.string().regex(/^[A-Z]{3}$/) });

/** Step 2: one destination → hotels for its best dates → complete trips. */
export async function POST(req: Request) {
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  return json(await tripsForDestination(body.data.params, body.data.destination));
}
