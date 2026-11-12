import { NextResponse } from "next/server";
import type { z } from "zod";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function readBody<T>(req: Request, schema: z.ZodType<T>, maxBytes = 8192): Promise<{ ok: true; data: T } | { ok: false; res: NextResponse }> {
  const text = await req.text().catch(() => "");
  if (text.length > maxBytes) return { ok: false, res: json({ error: "Payload too large" }, 413) };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, res: json({ error: "Invalid JSON" }, 400) };
  }
  const r = schema.safeParse(body);
  return r.success ? { ok: true, data: r.data } : { ok: false, res: json({ error: "Invalid request", issues: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400) };
}

const hits = new Map<string, { window: number; count: number }>();

// shortcut: per-instance memory, so the real limit is `limit × warm instances`; move to a shared store if the AI quota gets abused.
export function rateLimited(req: Request, route: string, limit: number, windowSec = 60) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const window = Math.floor(Date.now() / (windowSec * 1000));
  const key = `${route}:${ip}`;
  const h = hits.get(key);
  if (!h || h.window !== window) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { window, count: 1 });
    return false;
  }
  return ++h.count > limit;
}
