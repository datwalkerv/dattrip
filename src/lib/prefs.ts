import { z } from "zod";
import { CURRENCIES } from "./search-params";

const KEY = "dattrip:prefs";

/** What dattrip remembers between visits so a returning traveller only has to pick dates. Stays in the browser. */
const Prefs = z.object({
  from: z.array(z.string().regex(/^[A-Z]{3}$/)).min(1).max(4),
  adults: z.number().int().min(1).max(9).optional(),
  children: z.number().int().min(0).max(6).optional(),
  currency: z.enum(CURRENCIES).optional(),
});
export type Prefs = z.infer<typeof Prefs>;

/** Anything unreadable or of the wrong shape counts as "nothing remembered". */
export function parsePrefs(raw: string | null): Prefs | undefined {
  if (!raw) return undefined;
  try {
    const r = Prefs.safeParse(JSON.parse(raw));
    return r.success ? r.data : undefined;
  } catch {
    return undefined;
  }
}

export const readPrefs = () => parsePrefs(localStorage.getItem(KEY));
export const writePrefs = (p: Prefs) => localStorage.setItem(KEY, JSON.stringify(p));
