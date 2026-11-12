"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DestinationImage } from "@/components/destination/destination-image";
import { CATALOGUE } from "@/lib/catalogue";
import { money, monthLabel } from "@/lib/format";
import { labelFor } from "@/lib/labels";
import type { Destination, DestinationFlights } from "@/types/trip";

const FILTERS = [
  { tag: "", label: "All" },
  { tag: "city", label: "City breaks" },
  { tag: "beach", label: "Beach" },
  { tag: "winter-sun", label: "Winter sun" },
  { tag: "budget", label: "Budget" },
];
/** Shown first when there are no fares to order by. */
const FEATURED = ["LIS", "ROM", "BCN", "ATH", "CPH", "DBV", "PRG", "MLA", "RAK", "AMS"];
const SHOWN = 10;

interface Fare {
  price: number;
  currency: string;
}

/**
 * Destination cards with tag filters. When a departure airport is remembered, real return fares for next month
 * are fetched (the same call a search makes, cached server-side) and the cheapest destinations lead.
 */
export function DestinationExplorer({ from, month, onPick }: { from?: string[]; month: string; onPick: (code: string) => void }) {
  const [tag, setTag] = useState("");
  const [fares, setFares] = useState<Record<string, Fare>>({});
  const origin = from?.join(",");

  useEffect(() => {
    if (!origin) return;
    const abort = new AbortController();
    fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, signal: abort.signal, body: JSON.stringify({ params: { from: origin.split(","), month, adults: 1 }, limit: 60 }) })
      .then((r) => (r.ok ? r.json() : undefined))
      .then((d: { results?: DestinationFlights[] } | undefined) => {
        if (d?.results) setFares(Object.fromEntries(d.results.map((r) => [r.destination.code, { price: r.offers[0].pricePerAdult, currency: r.offers[0].currency }])));
      })
      .catch(() => {});
    return () => abort.abort();
  }, [origin, month]);

  const hasFares = Object.keys(fares).length > 0;
  const shown = useMemo(() => {
    // Destinations with a real fare lead, cheapest first; the rest follow in the featured order.
    const rank = (d: Destination) => (fares[d.code] ? fares[d.code].price - 1e6 : FEATURED.indexOf(d.code) + 1 || 99);
    return CATALOGUE.filter((d) => (!tag || d.tags?.includes(tag)) && !from?.includes(d.code))
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, SHOWN);
  }, [tag, fares, from]);

  return (
    <section className="mt-16 tablet:mt-24" aria-labelledby="discover">
      <div className="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between">
        <div>
          <h2 id="discover" className="text-title-1 font-semibold tracking-tight tablet:text-display-4">
            Where to next
          </h2>
          <p className="mt-1 text-subhead text-muted-foreground">
            {hasFares ? `Return flights from ${from!.map(labelFor).join(" or ")} in ${monthLabel(month)}, per adult. Cheapest first.` : `${CATALOGUE.length} destinations to search. Pick one, or leave it on Anywhere.`}
          </p>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 tablet:mx-0 tablet:px-0" role="group" aria-label="Filter destinations">
          {FILTERS.map((f) => (
            <button
              key={f.tag}
              type="button"
              aria-pressed={tag === f.tag}
              onClick={() => setTag(f.tag)}
              className={`h-9 shrink-0 rounded-full border px-4 text-subhead transition-colors ${tag === f.tag ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: one swipeable row. Desktop: two wide cards, then rows of four. */}
      <ul className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:grid tablet:grid-cols-12 tablet:gap-4 tablet:overflow-visible tablet:px-0">
        {shown.map((d, i) => {
          const fare = fares[d.code];
          const wide = i < 2;
          return (
            <li key={d.code} className={`w-[72%] shrink-0 snap-start tablet:w-auto ${wide ? "tablet:col-span-6" : "tablet:col-span-3"}`}>
              <button
                type="button"
                onClick={() => onPick(d.code)}
                aria-label={`Search trips to ${d.city}, ${d.country}${fare ? `, flights from ${money(fare.price, fare.currency)}` : ""}`}
                className={`group relative block w-full overflow-hidden rounded-xl bg-secondary text-left outline-offset-2 transition-transform duration-300 hover:-translate-y-0.5 ${wide ? "h-64 tablet:h-80" : "h-64 tablet:h-60"}`}
              >
                <DestinationImage destination={d} width={wide ? 1280 : 960} className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" aria-hidden />
                <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
                  <ArrowUpRight className="size-4" />
                </span>
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
                  <span>
                    <span className={`block font-semibold tracking-tight ${wide ? "text-title-1" : "text-title-3"}`}>{d.city}</span>
                    <span className="block text-subhead text-white/75">{d.country}</span>
                  </span>
                  {fare && (
                    <span className="tabular shrink-0 rounded-full bg-white/15 px-3 py-1 text-subhead font-medium backdrop-blur">
                      from {money(fare.price, fare.currency)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="mt-6 text-subhead text-muted-foreground">No destinations with that tag yet.</p>}
    </section>
  );
}
