import Link from "next/link";
import { depDate, retDate } from "@/lib/flights/offer";
import { dayLabel, money, monthLabel } from "@/lib/format";
import { type SearchParamsInput, toQuery } from "@/lib/search-params";
import type { FlightOffer } from "@/types/flight";

/**
 * Cheapest return fare per departure day in one month, for stays of the same length.
 * Days the provider has no recent fare for are left empty rather than estimated.
 */
export function PriceCalendar({ month, offers, base, selected }: { month: string; offers: FlightOffer[]; base: SearchParamsInput; selected: string }) {
  const byDay = new Map<string, FlightOffer>();
  for (const o of offers) {
    const d = depDate(o);
    if (d.startsWith(month) && (!byDay.has(d) || o.totalPrice < byDay.get(d)!.totalPrice)) byDay.set(d, o);
  }
  if (byDay.size < 2) return null;
  const prices = [...byDay.values()].map((o) => o.totalPrice).sort((a, b) => a - b);
  const cheap = prices[Math.floor((prices.length - 1) / 3)];
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first

  return (
    <section aria-labelledby="cal-title">
      <h2 id="cal-title" className="text-title-2 font-semibold tracking-tight">
        Cheapest dates in {monthLabel(month)}
      </h2>
      <p className="mt-1 text-subhead text-muted-foreground">Flight price by departure day for the same length of stay. Highlighted days are the cheapest third.</p>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="pb-1 text-caption-1 text-muted-foreground">
            {d}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = `${month}-${String(i + 1).padStart(2, "0")}`;
          const o = byDay.get(day);
          const cell = "flex min-h-14 flex-col items-center justify-center rounded-md border px-0.5 py-1";
          if (!o)
            return (
              <div key={day} className={`${cell} border-transparent text-muted-foreground/60`}>
                <span className="text-caption-1">{i + 1}</span>
              </div>
            );
          const isCheap = o.totalPrice <= cheap;
          return (
            <Link
              key={day}
              href={`/search?${toQuery({ ...base, dateMode: "exact", depart: day, ret: retDate(o) })}`}
              aria-label={`${dayLabel(day)} to ${dayLabel(retDate(o)!)}: flights ${money(o.totalPrice, o.currency)}${isCheap ? ", one of the cheapest days" : ""}`}
              aria-current={day === selected ? "date" : undefined}
              className={`${cell} transition-colors hover:border-foreground ${day === selected ? "border-foreground" : "border-border"} ${isCheap ? "bg-positive/15" : "bg-card"}`}
            >
              <span className="text-caption-1 text-muted-foreground">{i + 1}</span>
              <span className={`tabular text-caption-1 tablet:text-footnote ${isCheap ? "font-semibold" : ""}`}>{money(o.totalPrice, o.currency)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
