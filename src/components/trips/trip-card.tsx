import { buttonVariants, ContentBadge } from "datui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { DestinationImage } from "@/components/destination/destination-image";
import { HotelFacts } from "@/components/hotels/hotel-facts";
import { Img } from "@/components/img";
import { ago, airlineLogo, dayLabel, duration, money, stopsLabel } from "@/lib/format";
import type { Trip, TripLabel } from "@/types/trip";

export const goUrl = (t: Trip, part: "flight" | "hotel") => `/api/go?id=${t.id}&part=${part}&p=${part === "flight" ? t.flightPrice : t.hotelPrice}`;

export function TripCard({ trip, labels = [] }: { trip: Trip; labels?: TripLabel[] }) {
  const { destination: d, flight: f, hotel: h } = trip;
  const m = (n: number) => money(n, trip.currency);
  return (
    <article className="fade-in grid overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md tablet:grid-cols-[240px_1fr]">
      <Link href={`/trip/${trip.id}`} className="relative block" aria-label={`View trip to ${d.city}`}>
        <DestinationImage destination={d} width={500} className="h-44 w-full tablet:h-full" />
        {labels.length > 0 && (
          <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {labels.map((l) => (
              <ContentBadge key={l} size="m" appearance={l === "Cheapest" ? "positive" : "accent"}>
                {l}
              </ContentBadge>
            ))}
          </span>
        )}
      </Link>

      <div className="grid gap-4 p-4 tablet:grid-cols-[1fr_auto] tablet:gap-6 tablet:p-5">
        <div className="flex min-w-0 flex-col gap-3">
          <div>
            <h3 className="text-title-2 font-semibold tracking-tight">
              {d.city} <span className="text-headline-1 font-normal text-muted-foreground">{d.country}</span>
            </h3>
            <p className="text-subhead text-muted-foreground">
              {dayLabel(h.checkin)} – {dayLabel(h.checkout)} · {trip.nights} night{trip.nights > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-subhead">
            <Img src={airlineLogo(f.airline)} alt="" width={24} height={24} className="size-6 shrink-0 rounded bg-white object-contain" />
            <span className="min-w-0 truncate">
              <span className="font-medium">{f.airlineName ?? f.airline}</span>
              <span className="text-muted-foreground">
                {" "}
                · {f.outbound.from} → {f.outbound.to} · {stopsLabel(f.outbound.stops)}
                {duration(f.outbound.durationMin) ? ` · ${duration(f.outbound.durationMin)}` : ""}
                {f.inbound && f.inbound.stops !== f.outbound.stops ? ` · back: ${stopsLabel(f.inbound.stops).toLowerCase()}` : ""}
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="truncate text-subhead font-medium">{h.name}</p>
            <HotelFacts hotel={h} />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-separator pt-4 tablet:w-52 tablet:border-l tablet:border-t-0 tablet:pl-6 tablet:pt-0">
          <div>
            <p className="tabular text-display-4 font-semibold tracking-tight">{m(trip.total)}</p>
            <p className="text-footnote text-muted-foreground">
              {m(trip.perPerson)} per person{f.priceIsEstimate ? " · flights estimated" : ""}
            </p>
            <dl className="tabular mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-footnote text-muted-foreground">
              <dt>Flights</dt>
              <dd className="text-right">{m(trip.flightPrice)}</dd>
              <dt>Hotel</dt>
              <dd className="text-right">{m(trip.hotelPrice)}</dd>
              {trip.extraCosts > 0 && (
                <>
                  <dt>Paid at hotel</dt>
                  <dd className="text-right">{m(trip.extraCosts)}</dd>
                </>
              )}
            </dl>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={`/trip/${trip.id}`} className={buttonVariants({ size: "m", stretched: true })}>
              View trip
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <a href={goUrl(trip, "flight")} target="_blank" rel="noopener noreferrer sponsored" className={buttonVariants({ variant: "outline", appearance: "neutral", size: "s" })}>
                <span className="flex items-center gap-1">
                  Flight <ExternalLink className="size-3" aria-hidden />
                </span>
              </a>
              {h.bookingUrl ? (
                <a href={goUrl(trip, "hotel")} target="_blank" rel="noopener noreferrer sponsored" className={buttonVariants({ variant: "outline", appearance: "neutral", size: "s" })}>
                  <span className="flex items-center gap-1">
                    Hotel <ExternalLink className="size-3" aria-hidden />
                  </span>
                </a>
              ) : (
                <span className="flex items-center justify-center text-caption-1 text-muted-foreground">No hotel link</span>
              )}
            </div>
            <p className="text-caption-1 text-muted-foreground">Prices checked {ago(f.fetchedAt)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
