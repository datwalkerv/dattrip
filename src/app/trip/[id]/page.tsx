import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DestinationImage } from "@/components/destination/destination-image";
import { FlightLegs } from "@/components/flights/flight-legs";
import { HotelFacts } from "@/components/hotels/hotel-facts";
import { Img } from "@/components/img";
import { LinkButton } from "@/components/link-button";
import { AskPanel } from "@/components/trips/ask-panel";
import { PriceCalendar } from "@/components/trips/price-calendar";
import { SaveButton } from "@/components/trips/save-button";
import { ProviderNotice } from "@/components/trips/setup-card";
import { goUrl } from "@/components/trips/trip-card";
import { diffDays } from "@/lib/dates";
import { searchFlights } from "@/lib/flights/search-engine";
import { ago, dayLabel, money } from "@/lib/format";
import { hotelProvider } from "@/lib/hotels/search-engine";
import { SearchParamsSchema, toQuery } from "@/lib/search-params";
import { decodeTripId } from "@/lib/trip/id";
import { loadTrip, refParams } from "@/lib/trip/load";

export const metadata: Metadata = { title: "Trip details" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TripPage({ params, searchParams }: PageProps<"/trip/[id]">) {
  const { id } = await params;
  const ref = decodeTripId(id);
  if (!ref) notFound();
  const sp = await searchParams;
  const nights = diffDays(ref.dep, ref.ret);
  const month = ref.dep.slice(0, 7);
  const base = refParams(ref);
  const monthParams = SearchParamsSchema.parse({ ...base, dateMode: "month", month, depart: undefined, ret: undefined, minNights: nights, maxNights: nights });

  const [loaded, monthFlights] = await Promise.all([loadTrip(ref), searchFlights(monthParams, { limit: 1, perDestination: 62 }).catch(() => undefined)]);
  const { trip, destination } = loaded;
  const backHref = `/search?${toQuery(monthParams)}`;

  if (!destination) notFound();
  if (!trip) {
    const flightDown = loaded.flightStatus !== "ok";
    const hotelDown = loaded.hotelStatus !== "ok";
    return (
      <div className="mx-auto max-w-2xl pt-12">
        <h1 className="text-title-1 font-semibold tracking-tight">
          {destination.city}, {dayLabel(ref.dep)} – {dayLabel(ref.ret)}
        </h1>
        {flightDown ? (
          <ProviderNotice kind="flights" status={loaded.flightStatus} />
        ) : hotelDown ? (
          <ProviderNotice kind="hotels" status={loaded.hotelStatus} />
        ) : (
          <p className="mt-3 text-paragraph text-muted-foreground">
            {loaded.missing === "flight" ? "This flight fare is no longer in the provider's recent prices." : "This hotel no longer has availability for these dates at dattrip's rating and distance limits."} Prices move quickly; search the month again for current options.
          </p>
        )}
        <LinkButton href={backHref} className="mt-6">
          Search {destination.city} again
        </LinkButton>
      </div>
    );
  }

  const { flight: f, hotel: h } = trip;
  const m = (n: number) => money(n, trip.currency);
  const details = await hotelProvider.details(h.id).catch(() => undefined);
  const images = details?.images.length ? details.images : h.photo ? [h.photo] : [];
  const changed = one(sp.changed);
  const gone = one(sp.gone);
  const was = Number(one(sp.was));

  return (
    <div className="flex flex-col gap-10 pt-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-subhead text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> More trips to {destination.city}
        </Link>
        <div className="relative mt-4 overflow-hidden rounded-xl">
          <DestinationImage destination={destination} width={1920} className="h-56 w-full tablet:h-80" />
          {destination.photoCredit && (
            <a href={destination.photoCredit.url} target="_blank" rel="noopener noreferrer" className="absolute bottom-2 right-3 rounded bg-black/45 px-1.5 py-0.5 text-caption-2 text-white/90 hover:text-white">
              Photo: {destination.photoCredit.name}
            </a>
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display-3 font-semibold tracking-tight">{destination.city}</h1>
            <p className="text-body text-muted-foreground">
              {destination.country} · {dayLabel(h.checkin)} – {dayLabel(h.checkout)} · {trip.nights} night{trip.nights > 1 ? "s" : ""} · {ref.a + ref.c} traveller{ref.a + ref.c > 1 ? "s" : ""}
            </p>
          </div>
          <SaveButton trip={trip} />
        </div>
      </div>

      {(changed || gone) && (
        <p role="alert" className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-paragraph">
          {gone
            ? `The ${gone} offer couldn't be confirmed just now, so we didn't send you to the booking site. The details below are the latest we have.`
            : `The ${changed} price changed${Number.isFinite(was) && was > 0 ? ` from ${m(was)}` : ""} to ${m(changed === "hotel" ? trip.hotelPrice : trip.flightPrice)} since you opened this trip. The summary below is updated; continue if it still works for you.`}
        </p>
      )}

      <div className="grid gap-10 desktop:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="flights-title">
            <h2 id="flights-title" className="text-title-2 font-semibold tracking-tight">
              Flights
            </h2>
            <div className="mt-4 rounded-lg border border-border bg-card p-4 tablet:p-5">
              <FlightLegs flight={f} />
              <p className="mt-4 text-footnote text-muted-foreground">
                Times are local departure times. Arrival times, layover airports, baggage allowance and fare rules aren&apos;t provided by the fare source; they are shown on Aviasales before you pay.
                {f.priceIsEstimate ? ` The total is the single-adult fare of ${m(f.pricePerAdult)} × ${f.travellers} travellers.` : ""}
              </p>
            </div>
          </section>

          <section aria-labelledby="stay-title">
            <h2 id="stay-title" className="text-title-2 font-semibold tracking-tight">
              Where you&apos;ll stay
            </h2>
            {images.length > 0 && (
              <div className={`mt-4 grid gap-2 overflow-hidden rounded-lg ${images.length >= 3 ? "grid-cols-2 tablet:grid-cols-4" : "grid-cols-1"}`}>
                {images.slice(0, 5).map((src, i) => (
                  <Img key={src} src={src} alt={`${h.name}, photo ${i + 1}`} className={`w-full object-cover ${images.length >= 3 && i === 0 ? "col-span-2 row-span-2 h-full max-h-80" : "h-40 tablet:h-[9.75rem]"}`} />
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <h3 className="text-title-3 font-semibold">{h.name}</h3>
                {(details?.address ?? h.address) && <p className="text-subhead text-muted-foreground">{details?.address ?? h.address}</p>}
              </div>
              <HotelFacts hotel={h} />
              <dl className="grid gap-x-8 gap-y-3 rounded-lg border border-border bg-card p-4 text-subhead tablet:grid-cols-2 tablet:p-5">
                <div>
                  <dt className="text-footnote text-muted-foreground">Room</dt>
                  <dd>{h.rate.roomName || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-footnote text-muted-foreground">Meals</dt>
                  <dd>
                    {h.rate.boardName || (h.rate.breakfastIncluded ? "Breakfast included" : "Room only")}
                    {!h.rate.breakfastIncluded && h.breakfastRate && ` · with breakfast from ${m(h.breakfastRate.total)}`}
                    {h.rate.breakfastIncluded && h.cheapestRate.total < h.rate.total && ` · room only from ${m(h.cheapestRate.total)}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-footnote text-muted-foreground">Cancellation</dt>
                  <dd>{h.rate.refundable ? `Free cancellation${h.rate.freeCancellationUntil ? ` until ${h.rate.freeCancellationUntil.slice(0, 16)} (GMT)` : ""}` : "Non-refundable"}</dd>
                </div>
                <div>
                  <dt className="text-footnote text-muted-foreground">Price</dt>
                  <dd className="tabular">
                    {m(h.rate.total)} total · {m(h.rate.total / trip.nights)} per night
                  </dd>
                </div>
              </dl>
              {h.reasons.length > 0 && (
                <div>
                  <p className="text-subhead font-medium">Why this hotel</p>
                  <ul className="mt-1.5 flex flex-col gap-1 text-subhead text-muted-foreground">
                    {h.reasons.map((r) => (
                      <li key={r} className="flex items-center gap-2">
                        <Check className="size-3.5 shrink-0" aria-hidden /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {loaded.hotels.length > 0 && (
            <section aria-labelledby="alt-title">
              <h2 id="alt-title" className="text-title-2 font-semibold tracking-tight">
                Other hotels for these dates
              </h2>
              <ul className="mt-4 flex flex-col divide-y divide-separator rounded-lg border border-border bg-card">
                {loaded.hotels.map((t) => (
                  <li key={t.id}>
                    <Link href={`/trip/${t.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-secondary/60">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="truncate text-subhead font-medium">{t.hotel.name}</p>
                        <HotelFacts hotel={t.hotel} />
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular text-headline-1 font-semibold">{m(t.total)}</p>
                        <p className="text-caption-1 text-muted-foreground">
                          {t.total === trip.total ? "same total" : `${t.total > trip.total ? "+" : "−"}${m(Math.abs(t.total - trip.total))}`}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {monthFlights?.results[0] && <PriceCalendar month={month} offers={monthFlights.results[0].offers} base={base} selected={ref.dep} />}

          <AskPanel trips={[trip]} suggestions={["Why is this a good deal?", "Is this hotel in a good location?", "What can we visit nearby?", "Suggest a short itinerary"]} />
        </div>

        <aside className="desktop:sticky desktop:top-20 desktop:self-start" aria-labelledby="summary-title">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 id="summary-title" className="text-headline-1 font-semibold">
              Trip summary
            </h2>
            <dl className="tabular mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-subhead">
              <dt className="text-muted-foreground">Flights{f.priceIsEstimate ? " (estimated)" : ""}</dt>
              <dd className="text-right">{m(trip.flightPrice)}</dd>
              <dt className="text-muted-foreground">
                Hotel, {trip.nights} night{trip.nights > 1 ? "s" : ""}
              </dt>
              <dd className="text-right">{m(trip.hotelPrice)}</dd>
              <dt className="text-muted-foreground">Taxes and fees paid at the hotel</dt>
              <dd className="text-right">{trip.extraCosts > 0 ? m(trip.extraCosts) : "None listed"}</dd>
            </dl>
            <div className="mt-4 border-t border-separator pt-4">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-headline-2 font-medium">Total</span>
                <span className="tabular text-display-4 font-semibold tracking-tight">{m(trip.total)}</span>
              </div>
              <p className="tabular mt-0.5 text-right text-footnote text-muted-foreground">{m(trip.perPerson)} per person</p>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <LinkButton external href={goUrl(trip, "flight")} size="l" stretched>
                <span className="flex items-center gap-2">
                  Book flights on Aviasales <ExternalLink className="size-4" aria-hidden />
                </span>
              </LinkButton>
              {h.bookingUrl ? (
                <LinkButton external href={goUrl(trip, "hotel")} size="l" variant="secondary" appearance="neutral" stretched>
                  <span className="flex items-center gap-2">
                    Book the hotel <ExternalLink className="size-4" aria-hidden />
                  </span>
                </LinkButton>
              ) : (
                <p className="rounded-md bg-secondary px-3 py-2 text-footnote text-muted-foreground">Hotel booking links need LITEAPI_WHITELABEL_DOMAIN to be set.</p>
              )}
            </div>
            <p className="mt-4 text-caption-1 text-muted-foreground">
              Flight price {f.foundAt ? `found ${ago(f.foundAt)}` : `checked ${ago(f.fetchedAt)}`}, hotel checked {ago(h.fetchedAt)}. Both are re-checked when you click, and you book and pay on the providers&apos; sites, not on dattrip.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
