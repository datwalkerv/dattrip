import type { SearchParams } from "./search-params";

/** All dates are calendar days as YYYY-MM-DD; maths is done in UTC so no timezone can shift a day. */
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(ms(d) + n * 86_400_000).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 86_400_000);
export const today = () => new Date().toISOString().slice(0, 10);
const monthStart = (m: string) => `${m}-01`;
const monthEnd = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
};
const max = (a: string, b: string) => (a > b ? a : b);
const min = (a: string, b: string) => (a < b ? a : b);

export interface DateWindow {
  depFrom: string;
  depTo: string;
  /** Absent for one-way trips. */
  retFrom?: string;
  retTo?: string;
  minNights: number;
  maxNights: number;
}

/** Turns the three date modes into one shape: allowed departure days, allowed return days, allowed nights. */
export function dateWindow(p: SearchParams, now = today()): DateWindow {
  const oneWay = p.tripType === "oneway";
  if (p.dateMode === "month") {
    const depFrom = max(monthStart(p.month!), now);
    const depTo = monthEnd(p.month!);
    if (oneWay) return { depFrom, depTo, minNights: 0, maxNights: 0 };
    let retFrom = addDays(depFrom, p.minNights);
    let retTo = addDays(depTo, p.maxNights);
    if (p.retMonth) {
      retFrom = max(retFrom, monthStart(p.retMonth));
      retTo = min(retTo, monthEnd(p.retMonth));
    }
    return { depFrom, depTo, retFrom, retTo, minNights: p.minNights, maxNights: p.maxNights };
  }
  const flex = p.dateMode === "flex" ? p.flexDays : 0;
  const depFrom = max(addDays(p.depart!, -flex), now);
  const depTo = addDays(p.depart!, flex);
  if (oneWay || !p.ret) return { depFrom, depTo, minNights: 0, maxNights: 0 };
  const nights = diffDays(p.depart!, p.ret);
  return {
    depFrom,
    depTo,
    retFrom: addDays(p.ret, -flex),
    retTo: addDays(p.ret, flex),
    minNights: Math.max(1, nights - 2 * flex),
    maxNights: nights + 2 * flex,
  };
}

function months(from: string, to: string) {
  const out: string[] = [];
  for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = addDays(monthEnd(m), 1).slice(0, 7)) out.push(m);
  return out;
}

/**
 * The fewest provider queries that cover the window: one exact-day query when both days are fixed,
 * otherwise one per (departure month, return month). The provider answers each with real date pairs,
 * so a whole month costs one request, not one per day.
 */
export function providerQueries(w: DateWindow): { departure: string; ret?: string }[] {
  if (!w.retFrom || !w.retTo) return w.depFrom === w.depTo ? [{ departure: w.depFrom }] : months(w.depFrom, w.depTo).map((departure) => ({ departure }));
  if (w.depFrom === w.depTo && w.retFrom === w.retTo) return [{ departure: w.depFrom, ret: w.retFrom }];
  const out: { departure: string; ret: string }[] = [];
  for (const departure of months(w.depFrom, w.depTo)) for (const ret of months(w.retFrom, w.retTo)) if (ret >= departure) out.push({ departure, ret });
  return out;
}

export function inWindow(w: DateWindow, dep: string, ret?: string) {
  if (dep < w.depFrom || dep > w.depTo) return false;
  if (!w.retFrom || !w.retTo) return !ret;
  if (!ret || ret < w.retFrom || ret > w.retTo) return false;
  const n = diffDays(dep, ret);
  return n >= w.minNights && n <= w.maxNights;
}
