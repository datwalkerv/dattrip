import { ContentBadge } from "datui";
import { Coffee, MapPin, Star } from "lucide-react";
import type { RankedHotel } from "@/types/hotel";

/** Rating, distance and what the selected rate includes. The breakfast badge only appears for a breakfast-inclusive rate. */
export function HotelFacts({ hotel }: { hotel: RankedHotel }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-subhead">
      <span className="flex items-center gap-1 font-medium">
        <Star className="size-3.5 fill-current" aria-hidden />
        {hotel.rating.toFixed(1)}
        {hotel.reviewCount > 0 && <span className="font-normal text-muted-foreground">({hotel.reviewCount.toLocaleString("en")})</span>}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground">
        <MapPin className="size-3.5" aria-hidden />
        {hotel.distanceKm.toFixed(1)} km from centre
      </span>
      {hotel.rate.breakfastIncluded ? (
        <ContentBadge size="s" variant="secondary" appearance="positive">
          <span className="flex items-center gap-1">
            <Coffee className="size-3" aria-hidden /> Breakfast included
          </span>
        </ContentBadge>
      ) : (
        <span className="text-footnote text-muted-foreground">Room only</span>
      )}
      {hotel.rate.refundable && (
        <ContentBadge size="s" variant="outline" appearance="neutral">
          Free cancellation
        </ContentBadge>
      )}
    </div>
  );
}
