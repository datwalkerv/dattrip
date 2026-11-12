import { z } from "zod";

export const CURRENCIES = ["EUR", "HUF", "USD", "GBP", "CHF", "PLN", "CZK", "RON"] as const;
export const CABINS = ["economy", "premium", "business", "first"] as const;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const month = z.string().regex(/^\d{4}-\d{2}$/);
const iata = z.string().regex(/^[A-Z]{3}$/);
/** A city/airport code, or `c:XX` for a whole country. */
const target = z.string().regex(/^([A-Z]{3}|c:[A-Z]{2})$/);

export const SearchParamsSchema = z
  .object({
    from: z.array(iata).min(1, "Choose where you fly from").max(4),
    /** Empty means Anywhere. */
    to: z.array(target).max(8).default([]),
    tripType: z.enum(["return", "oneway"]).default("return"),
    dateMode: z.enum(["exact", "flex", "month"]).default("month"),
    depart: day.optional(),
    ret: day.optional(),
    flexDays: z.number().int().min(1).max(3).default(2),
    month: month.optional(),
    retMonth: month.optional(),
    minNights: z.number().int().min(1).max(30).default(3),
    maxNights: z.number().int().min(1).max(30).default(5),
    adults: z.number().int().min(1).max(9).default(2),
    children: z.number().int().min(0).max(6).default(0),
    cabin: z.enum(CABINS).default("economy"),
    maxBudget: z.number().positive().max(1e8).optional(),
    direct: z.boolean().default(false),
    currency: z.enum(CURRENCIES).default("EUR"),
  })
  .superRefine((p, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (p.dateMode === "month") {
      if (!p.month) issue("month", "Choose a month");
      if (p.retMonth && p.month && p.retMonth < p.month) issue("retMonth", "Return month is before departure");
    } else {
      if (!p.depart) issue("depart", "Choose a departure date");
      if (p.tripType === "return" && !p.ret) issue("ret", "Choose a return date");
      if (p.depart && p.ret && p.ret <= p.depart) issue("ret", "Return must be after departure");
    }
    if (p.maxNights < p.minNights) issue("maxNights", "Longest stay is shorter than shortest stay");
  });

export type SearchParams = z.infer<typeof SearchParamsSchema>;
export type SearchParamsInput = z.input<typeof SearchParamsSchema>;

/** Compact, shareable query string. Defaults are omitted. */
export function toQuery(p: SearchParamsInput): string {
  const q = new URLSearchParams();
  const set = (k: string, v: unknown, def?: unknown) => v !== undefined && v !== "" && v !== def && q.set(k, String(v));
  set("from", p.from.join(","));
  set("to", p.to?.join(","));
  set("type", p.tripType, "return");
  set("dates", p.dateMode, "month");
  if (p.dateMode === "month" || p.dateMode === undefined) {
    set("month", p.month);
    set("retMonth", p.retMonth);
  } else {
    set("depart", p.depart);
    set("ret", p.ret);
    if (p.dateMode === "flex") set("flex", p.flexDays, 2);
  }
  set("nights", `${p.minNights ?? 3}-${p.maxNights ?? 5}`, "3-5");
  set("adults", p.adults, 2);
  set("children", p.children, 0);
  set("cabin", p.cabin, "economy");
  set("budget", p.maxBudget);
  set("direct", p.direct ? 1 : undefined);
  set("cur", p.currency, "EUR");
  return q.toString();
}

type Query = Record<string, string | string[] | undefined> | URLSearchParams;

export function fromQuery(query: Query) {
  const get = (k: string) => {
    const v = query instanceof URLSearchParams ? query.get(k) : query[k];
    return (Array.isArray(v) ? v[0] : v) || undefined;
  };
  const list = (k: string) => get(k)?.split(",").filter(Boolean);
  const num = (k: string) => (get(k) === undefined ? undefined : Number(get(k)));
  const [minNights, maxNights] = get("nights")?.split("-").map(Number) ?? [];
  return SearchParamsSchema.safeParse({
    from: list("from") ?? [],
    to: list("to"),
    tripType: get("type"),
    dateMode: get("dates"),
    depart: get("depart"),
    ret: get("ret"),
    flexDays: num("flex"),
    month: get("month"),
    retMonth: get("retMonth"),
    minNights,
    maxNights,
    adults: num("adults"),
    children: num("children"),
    cabin: get("cabin"),
    maxBudget: num("budget"),
    direct: get("direct") === "1",
    currency: get("cur"),
  });
}

export const travellers = (p: Pick<SearchParams, "adults" | "children">) => p.adults + p.children;
