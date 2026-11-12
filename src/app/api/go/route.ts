import { NextResponse } from "next/server";
import { decodeTripId } from "@/lib/trip/id";
import { loadTrip } from "@/lib/trip/load";

/**
 * Booking hand-off. Re-checks the offer with the provider first; if it is gone or the price moved by more
 * than 1%, the traveller goes back to the trip page to see the new price instead of being surprised at checkout.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const part = url.searchParams.get("part") === "hotel" ? "hotel" : "flight";
  const seen = Number(url.searchParams.get("p"));
  const ref = decodeTripId(id);
  if (!ref) return NextResponse.json({ error: "Unknown trip" }, { status: 400 });

  const back = (q: string) => NextResponse.redirect(new URL(`/trip/${id}?${q}`, url.origin), 303);
  const loaded = await loadTrip(ref, true).catch(() => undefined);
  if (!loaded?.trip) return back(`gone=${loaded?.missing === "hotel" ? "hotel" : part}`);

  const price = part === "flight" ? loaded.trip.flightPrice : loaded.trip.hotelPrice;
  const target = part === "flight" ? loaded.trip.flight.bookingUrl : loaded.trip.hotel.bookingUrl;
  if (!target) return back(`gone=${part}`);
  if (Number.isFinite(seen) && seen > 0 && Math.abs(price - seen) > seen * 0.01) return back(`changed=${part}&was=${seen}&now=${price}`);
  // `target` is always built server-side from provider data, never from the request.
  return NextResponse.redirect(target, 303);
}
