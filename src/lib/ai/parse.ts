import { z } from "zod";
import { CATALOGUE } from "@/lib/catalogue";
import { today } from "@/lib/dates";
import { CURRENCIES, SearchParamsSchema, type SearchParamsInput } from "@/lib/search-params";
import { generate } from "./client";

const codes = CATALOGUE.map((d) => d.code) as [string, ...string[]];

/** What Gemini may fill in. Destinations are limited to catalogue codes, so it can't send a search somewhere made up. */
const AiSearch = z.object({
  from: z.array(z.string().regex(/^[A-Z]{3}$/)).max(4).optional().describe("IATA codes of the departure cities/airports the user named. Omit if none were named."),
  to: z.array(z.enum(codes)).max(8).optional().describe("Destination codes from the catalogue. Empty or omitted means Anywhere."),
  tripType: z.enum(["return", "oneway"]).optional(),
  dateMode: z.enum(["exact", "flex", "month"]).optional().describe("month = sometime in a month; exact = specific dates; flex = specific dates give or take a few days"),
  depart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ret: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  minNights: z.number().int().min(1).max(30).optional(),
  maxNights: z.number().int().min(1).max(30).optional(),
  adults: z.number().int().min(1).max(9).optional(),
  children: z.number().int().min(0).max(6).optional(),
  direct: z.boolean().optional(),
  maxBudget: z.number().positive().optional().describe("Maximum total trip price, only if the user gave a number"),
  currency: z.enum(CURRENCIES).optional(),
});

const SYSTEM = `You turn a traveller's request into search criteria for dattrip, a flight + hotel deal finder.
Only extract what the request says or clearly implies. Never invent prices, flights, hotels or availability: you only fill in search fields.
Rules:
- "to": use only codes from the catalogue below. For vague wishes ("somewhere warm", "a beach", "cheap city break") pick up to 8 catalogue codes whose tags and location fit, considering the season of the requested dates. If the user is open to anywhere, leave "to" empty.
- "a 5-day trip" means 4 nights. A range like "4-6 nights" sets minNights and maxNights. A single length sets both to it.
- A month without a year means the next occurrence of that month on or after today.
- Leave out any field the request does not determine.`;

export interface AiInterpretation {
  /** Fields understood from the request, merged over the form's defaults. */
  params: Partial<SearchParamsInput>;
  /** True when the criteria are enough to run a search right away. */
  complete: boolean;
}

export async function interpretSearch(text: string): Promise<AiInterpretation> {
  const catalogue = CATALOGUE.map((d) => `${d.code} ${d.city}, ${d.country} [${d.tags?.join(", ")}]`).join("\n");
  const reply = await generate({
    system: `${SYSTEM}\n\nToday is ${today()}.\n\nCatalogue:\n${catalogue}`,
    prompt: text,
    schema: z.toJSONSchema(AiSearch),
  });
  let raw: unknown;
  try {
    raw = JSON.parse(reply);
  } catch {
    raw = {};
  }
  // Field by field: one bad value from the model must not discard the rest.
  const params: Record<string, unknown> = {};
  if (raw && typeof raw === "object")
    for (const [k, v] of Object.entries(raw)) {
      const field = AiSearch.shape[k as keyof typeof AiSearch.shape];
      if (field && v !== null && field.safeParse(v).success) params[k] = v;
    }
  if (params.minNights && !params.maxNights) params.maxNights = params.minNights;
  if (params.depart && !params.dateMode) params.dateMode = "exact";
  if (params.month && !params.depart) params.dateMode = "month";
  return { params, complete: SearchParamsSchema.safeParse(params).success };
}
