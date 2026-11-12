import { buttonVariants } from "datui";
import { ExternalLink } from "lucide-react";
import { ago, money } from "@/lib/format";
import type { FlightOffer } from "@/types/flight";
import type { Destination } from "@/types/trip";
import { FlightLegs } from "./flight-legs";

export function FlightCard({ flight, destination }: { flight: FlightOffer; destination: Destination }) {
  return (
    <article className="fade-in flex flex-col gap-4 rounded-lg border border-border bg-card p-4 tablet:flex-row tablet:items-center tablet:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-headline-1 font-semibold">
          {destination.city} <span className="font-normal text-muted-foreground">{destination.country}</span>
        </h3>
        <FlightLegs flight={flight} />
      </div>
      <div className="flex shrink-0 items-end justify-between gap-4 tablet:flex-col tablet:items-end">
        <div className="tablet:text-right">
          <p className="tabular text-title-1 font-semibold tracking-tight">{money(flight.totalPrice, flight.currency)}</p>
          <p className="text-footnote text-muted-foreground">
            {flight.priceIsEstimate ? `est. for ${flight.travellers} · ${money(flight.pricePerAdult, flight.currency)} each` : "per traveller"} · checked {ago(flight.fetchedAt)}
          </p>
        </div>
        <a href={flight.bookingUrl} target="_blank" rel="noopener noreferrer sponsored" className={buttonVariants({ variant: "outline", appearance: "neutral", size: "m" })}>
          <span className="flex items-center gap-1.5">
            Book on Aviasales <ExternalLink className="size-3.5" aria-hidden />
          </span>
        </a>
      </div>
    </article>
  );
}
