import { z } from "zod";

const opt = z.string().trim().optional().transform((s) => s || undefined);

const Env = z.object({
  TRAVELPAYOUTS_TOKEN: opt,
  TRAVELPAYOUTS_MARKER: opt,
  LITEAPI_KEY: opt,
  LITEAPI_WHITELABEL_DOMAIN: opt.transform((s) => s?.replace(/^https?:\/\//, "").replace(/\/$/, "")),
  GEMINI_API_KEY: opt,
  GEMINI_MODEL: opt.transform((s) => s ?? "gemini-3.5-flash-lite"),
});

let cached: z.infer<typeof Env> | undefined;

/** Every key is optional: a missing one turns that provider into a setup state, not a crash. */
export function env() {
  return (cached ??= Env.parse(process.env));
}
