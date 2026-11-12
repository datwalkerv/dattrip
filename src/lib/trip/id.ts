import { z } from "zod";
import { CURRENCIES } from "@/lib/search-params";

/** Everything needed to look a trip up again. The id is the trip: no database, and links stay shareable. */
const Ref = z.object({
  o: z.string().regex(/^[A-Z]{3}$/),
  d: z.string().regex(/^[A-Z]{3}$/),
  dep: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ret: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  al: z.string().max(3),
  h: z.string().min(1).max(40),
  /** 1 = the breakfast-inclusive rate was the one shown. */
  b: z.union([z.literal(0), z.literal(1)]),
  a: z.number().int().min(1).max(9),
  c: z.number().int().min(0).max(6),
  cur: z.enum(CURRENCIES),
});
export type TripRef = z.infer<typeof Ref>;

export const encodeTripId = (r: TripRef) => Buffer.from(JSON.stringify(r)).toString("base64url");

export function decodeTripId(id: string): TripRef | undefined {
  try {
    const r = Ref.safeParse(JSON.parse(Buffer.from(id, "base64url").toString("utf8")));
    return r.success ? r.data : undefined;
  } catch {
    return undefined;
  }
}
