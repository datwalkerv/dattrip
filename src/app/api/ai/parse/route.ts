import { z } from "zod";
import { interpretSearch } from "@/lib/ai/parse";
import { statusOf } from "@/lib/errors";
import { json, rateLimited, readBody } from "@/lib/server";

const Body = z.object({ text: z.string().trim().min(3).max(500) });

export async function POST(req: Request) {
  if (rateLimited(req, "ai", 6)) return json({ error: "rate_limited" }, 429);
  const body = await readBody(req, Body);
  if (!body.ok) return body.res;
  try {
    return json(await interpretSearch(body.data.text));
  } catch (e) {
    const s = statusOf(e);
    return json({ error: s }, s === "not_configured" ? 501 : s === "rate_limited" ? 429 : 502);
  }
}
