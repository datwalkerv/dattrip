export const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: amount >= 1000 || Number.isInteger(amount) ? 0 : 2 }).format(amount);

export const duration = (min?: number) => (min ? `${Math.floor(min / 60)}h ${String(Math.round(min % 60)).padStart(2, "0")}m` : undefined);

export const stopsLabel = (n: number) => (n === 0 ? "Direct" : n === 1 ? "1 stop" : `${n} stops`);

/** "Sat 14 Nov" from YYYY-MM-DD or an ISO timestamp, without shifting the calendar day. */
export const dayLabel = (iso: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));

/** Local wall-clock time as the provider wrote it ("06:25"): read from the string, never converted. */
export const localTime = (iso: string) => iso.slice(11, 16);

export const monthLabel = (m: string) => new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

export function ago(iso: string, now = Date.now()) {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

export const airlineLogo = (code: string) => `https://pics.avs.io/96/96/${encodeURIComponent(code)}@2x.png`;
