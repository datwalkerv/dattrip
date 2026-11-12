import { Img } from "@/components/img";
import type { Destination } from "@/types/trip";

/** Wikimedia only serves thumbnails at these widths. */
const STEPS = [330, 500, 960, 1280, 1920];
/** Asks the photo's own CDN for the size we need: Unsplash takes query parameters, Wikimedia a width in the path. */
const sized = (url: string, width: number) =>
  url.includes("images.unsplash.com") ? `${url}${url.includes("?") ? "&" : "?"}w=${width}&q=70&auto=format&fit=crop` : url.replace(/\/\d+px-/, `/${STEPS.find((s) => s >= width) ?? 1920}px-`);

/** Destination photo, or a quiet typographic tile when the catalogue has no photo for it yet. */
export function DestinationImage({ destination, width = 960, className = "" }: { destination: Destination; width?: number; className?: string }) {
  if (destination.photo) return <Img src={sized(destination.photo, width)} alt={`${destination.city}, ${destination.country}`} className={`object-cover ${className}`} />;
  return (
    <div role="img" aria-label={`${destination.city}, ${destination.country}`} className={`flex items-end bg-secondary p-4 ${className}`}>
      <span className="text-display-3 font-semibold tracking-tight text-foreground/15">{destination.code}</span>
    </div>
  );
}
