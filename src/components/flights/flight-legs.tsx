import { ContentBadge } from "datui";
import { Img } from "@/components/img";
import { airlineLogo, dayLabel, duration, localTime, stopsLabel } from "@/lib/format";
import type { FlightLeg, FlightOffer } from "@/types/flight";

function Leg({ leg, label }: { leg: FlightLeg; label: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-subhead">
      <span className="w-16 shrink-0 text-footnote text-muted-foreground">{label}</span>
      <span className="font-medium">
        {leg.from} → {leg.to}
      </span>
      <span className="tabular">
        {dayLabel(leg.departAt)}, {localTime(leg.departAt)}
      </span>
      {duration(leg.durationMin) && <span className="text-muted-foreground">{duration(leg.durationMin)}</span>}
      <ContentBadge size="s" variant="secondary" appearance={leg.stops === 0 ? "positive" : "neutral"}>
        {stopsLabel(leg.stops)}
      </ContentBadge>
      {leg.flightNumber && <span className="text-footnote text-muted-foreground">{leg.flightNumber}</span>}
    </div>
  );
}

/** Airline plus both directions. Shows only what the provider returned: times are local departure times. */
export function FlightLegs({ flight }: { flight: FlightOffer }) {
  return (
    <div className="flex gap-3">
      <Img src={airlineLogo(flight.airline)} alt="" width={32} height={32} className="mt-0.5 size-8 shrink-0 rounded-md bg-white object-contain" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-subhead font-medium">{flight.airlineName ?? flight.airline}</p>
        <Leg leg={flight.outbound} label="Outbound" />
        {flight.inbound && <Leg leg={flight.inbound} label="Return" />}
      </div>
    </div>
  );
}
