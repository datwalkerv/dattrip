import { Img } from "@/components/img";
import type { Destination } from "@/types/trip";

/** Destination photo, or a quiet typographic tile when the catalogue has no photo for it yet. */
export function DestinationImage({ destination, width = 800, className = "" }: { destination: Destination; width?: number; className?: string }) {
  if (destination.photo)
    return <Img src={`${destination.photo}${destination.photo.includes("?") ? "&" : "?"}w=${width}&q=70&auto=format&fit=crop`} alt={`${destination.city}, ${destination.country}`} className={`object-cover ${className}`} />;
  return (
    <div role="img" aria-label={`${destination.city}, ${destination.country}`} className={`flex items-end bg-secondary p-4 ${className}`}>
      <span className="text-display-3 font-semibold tracking-tight text-foreground/15">{destination.code}</span>
    </div>
  );
}
