import { z } from "zod";
import { askAboutTrips } from "@/lib/ai/ask";
import { statusOf } from "@/lib/errors";
import { json, rateLimited, readBody } from "@/lib/server";
import { TripDigest } from "@/lib/trip/digest";

const Body = z.object({ question: z.string().trim().min(3).max(400), trips: z.array(TripDigest).min(1).max(6) });

export async function POST(req: Request) {
  if (rateLimited(req, "ai", 6)) return json({ error: "rate_limited" }, 429);
  const body = await readBody(req, Body, 16_384);
  if (!body.ok) return body.res;
  try {
    return json({ answer: await askAboutTrips(body.data.question, body.data.trips) });
  } catch (e) {
    const s = statusOf(e);
    return json({ error: s }, s === "not_configured" ? 501 : s === "rate_limited" ? 429 : 502);
  }
}
