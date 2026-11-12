"use client";

import { Button, Checkbox, FormItem, Input, NativeSelect, Placeholder, SegmentedControl, Skeleton, Slider, Spinner, Switch } from "datui";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlightCard } from "@/components/flights/flight-card";
import { flightMinutes, flightStops } from "@/lib/flights/offer";
import { money } from "@/lib/format";
import { type SearchParams, travellers } from "@/lib/search-params";
import { bestPerDestination, labelTrips, sortTrips, valueScores } from "@/lib/trip/ranking";
import type { DestinationTrips } from "@/lib/trip/load";
import type { FlightOffer } from "@/types/flight";
import type { Destination, DestinationFlights, ProviderStatus, TripSort } from "@/types/trip";
import { AskPanel } from "./ask-panel";
import { ProviderNotice } from "./setup-card";
import { TripCard } from "./trip-card";

interface SearchResponse {
  results: DestinationFlights[];
  status: ProviderStatus;
  failedQueries: number;
  totalDestinations: number;
  hotelsConfigured: boolean;
}
type DestState = { state: "loading" } | { state: "error" } | ({ state: "done" } & DestinationTrips);

const post = async <T,>(url: string, body: unknown, signal: AbortSignal): Promise<T> => {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

interface Filters {
  maxTotal?: number;
  maxLegHours?: number;
  direct: boolean;
  minRating: number;
  maxKm: number;
  breakfast: boolean;
  refundable: boolean;
  nights: [number, number];
}

type FlightSort = "cheapest" | "shortest" | "stops" | "value";

function sortFlights(rows: { flight: FlightOffer; destination: Destination }[], sort: FlightSort) {
  const price = (r: (typeof rows)[number]) => r.flight.totalPrice;
  const mins = (r: (typeof rows)[number]) => flightMinutes(r.flight) || Infinity;
  const stops = (r: (typeof rows)[number]) => flightStops(r.flight);
  if (sort === "cheapest") return [...rows].sort((a, b) => price(a) - price(b));
  if (sort === "shortest") return [...rows].sort((a, b) => mins(a) - mins(b) || price(a) - price(b));
  if (sort === "stops") return [...rows].sort((a, b) => stops(a) - stops(b) || price(a) - price(b));
  // Best value for a flight: price, plus a penalty of 10% of the cheapest fare per stop and per extra hour over the fastest.
  const base = Math.min(...rows.map(price));
  const fastest = Math.min(...rows.map(mins));
  const score = (r: (typeof rows)[number]) => price(r) + base * 0.1 * (stops(r) + (Number.isFinite(mins(r)) ? (mins(r) - fastest) / 60 : 2));
  return [...rows].sort((a, b) => score(a) - score(b));
}

export function Results({ params }: { params: SearchParams }) {
  const [search, setSearch] = useState<SearchResponse>();
  const [failed, setFailed] = useState(false);
  const [dests, setDests] = useState<Record<string, DestState>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const abort = useRef<AbortController>(undefined);

  const wantTrips = params.tripType === "return";
  const [view, setView] = useState<"trips" | "flights">(wantTrips ? "trips" : "flights");
  const [sort, setSort] = useState<TripSort>("cheapest");
  const [flightSort, setFlightSort] = useState<FlightSort>("cheapest");
  const [allOptions, setAllOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({ direct: false, minRating: 8, maxKm: 3, breakfast: false, refundable: false, nights: [1, 30] });
  const setF = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  // Step 2 for a batch of destinations, four at a time; each card fills in as its destination resolves.
  const loadTrips = async (batch: DestinationFlights[], signal: AbortSignal) => {
    const queue = batch.map((b) => b.destination.code);
    setDests((d) => ({ ...d, ...Object.fromEntries(queue.map((c) => [c, { state: "loading" } as DestState])) }));
    const worker = async () => {
      for (let code = queue.shift(); code; code = queue.shift()) {
        const c = code;
        try {
          const r = await post<DestinationTrips>("/api/trips", { params, destination: c }, signal);
          setDests((d) => ({ ...d, [c]: { state: "done", ...r } }));
        } catch {
          if (!signal.aborted) setDests((d) => ({ ...d, [c]: { state: "error" } }));
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
  };

  const load = async (offset: number) => {
    const signal = abort.current!.signal;
    try {
      const r = await post<SearchResponse>("/api/search", { params, offset }, signal);
      setSearch((prev) => (prev && offset ? { ...r, results: [...prev.results, ...r.results] } : r));
      if (wantTrips && r.hotelsConfigured) await loadTrips(r.results, signal);
    } catch {
      if (!signal.aborted) setFailed(true);
    }
  };

  useEffect(() => {
    abort.current = new AbortController();
    load(0);
    return () => abort.current?.abort();
    // Runs once: the page remounts this component (key = query string) for a new search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const states = Object.values(dests);
  const pending = states.filter((s) => s.state === "loading").length;
  const unpriced = states.filter((s) => s.state === "error" || (s.state === "done" && s.hotelStatus !== "ok")).length;
  const hotelStatus = states.find((s): s is Extract<DestState, { state: "done" }> => s.state === "done" && s.hotelStatus !== "ok")?.hotelStatus;
  const allTrips = useMemo(() => Object.values(dests).flatMap((s) => (s.state === "done" ? s.trips : [])), [dests]);

  const trips = useMemo(
    () =>
      allTrips.filter(
        (t) =>
          (!filters.maxTotal || t.total <= filters.maxTotal) &&
          (!filters.maxLegHours || Math.max(t.flight.outbound.durationMin ?? 0, t.flight.inbound?.durationMin ?? 0) <= filters.maxLegHours * 60) &&
          (!filters.direct || flightStops(t.flight) === 0) &&
          t.hotel.rating >= filters.minRating &&
          t.hotel.distanceKm <= filters.maxKm &&
          (!filters.breakfast || t.hotel.rate.breakfastIncluded) &&
          (!filters.refundable || t.hotel.rate.refundable) &&
          t.nights >= filters.nights[0] &&
          t.nights <= filters.nights[1],
      ),
    [allTrips, filters],
  );
  // Labels are only earned once every destination has answered, and only against what was actually priced.
  const labels = useMemo(() => (pending ? new Map() : labelTrips(trips)), [trips, pending]);
  const shown = useMemo(() => (allOptions ? sortTrips(trips, sort) : bestPerDestination(trips, sort)), [trips, sort, allOptions]);
  const top = useMemo(() => {
    const s = valueScores(trips);
    return [...trips].sort((a, b) => s.get(b.id)! - s.get(a.id)!).slice(0, 5);
  }, [trips]);

  const flightRows = useMemo(() => {
    if (!search) return [];
    const rows = search.results.flatMap((r) => {
      const s = dests[r.destination.code];
      const offers = s?.state === "done" && s.flights.length ? s.flights : r.offers;
      return (allOptions ? offers : offers.slice(0, 1)).map((flight) => ({ flight, destination: r.destination }));
    });
    return rows.length ? sortFlights(rows, flightSort) : rows;
  }, [search, dests, flightSort, allOptions]);

  if (failed) return <Placeholder icon={<SearchX className="size-8" />} title="The search didn't go through" action={<Button onClick={() => location.reload()}>Try again</Button>}>Check your connection and try again.</Placeholder>;

  if (!search)
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Searching flights">
        <p className="flex items-center gap-2 text-subhead text-muted-foreground">
          <Spinner size="s" /> Comparing flight dates…
        </p>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={176} borderRadius={12} />
        ))}
      </div>
    );

  if (search.status !== "ok") return <ProviderNotice kind="flights" status={search.status} />;
  if (!search.results.length)
    return (
      <Placeholder icon={<SearchX className="size-8" />} title="No flights found for this search">
        Flight prices come from fares other travellers found recently, so quiet routes and far-off dates can come up empty. Try a whole month, more departure airports, or Anywhere.
      </Placeholder>
    );

  const nightsRange: [number, number] = [params.minNights, params.maxNights];
  const hasNightsRange = params.dateMode === "month" && nightsRange[0] !== nightsRange[1];
  const more = search.totalDestinations > search.results.length;

  return (
    <div className="grid gap-6 desktop:grid-cols-[240px_1fr]">
      <aside className="desktop:sticky desktop:top-20 desktop:self-start">
        <Button className="desktop:hidden" variant="outline" appearance="neutral" before={<SlidersHorizontal className="size-4" />} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-controls="filters">
          Filters
        </Button>
        <div id="filters" className={`${showFilters ? "mt-3 block" : "hidden"} rounded-lg border border-border bg-card p-1 desktop:mt-0 desktop:block`}>
          <FormItem top="Max total price" htmlFor="f-total">
            <Input id="f-total" type="number" inputMode="numeric" min={0} placeholder={`Any (${params.currency})`} value={filters.maxTotal ?? ""} onChange={(e) => setF({ maxTotal: e.target.value ? Number(e.target.value) : undefined })} />
          </FormItem>
          <FormItem top="Flight time, each way" htmlFor="f-dur">
            <NativeSelect id="f-dur" value={filters.maxLegHours ?? ""} onChange={(_, v) => setF({ maxLegHours: v ? Number(v) : undefined })}>
              <option value="">Any</option>
              {[2, 3, 4, 6, 8].map((h) => (
                <option key={h} value={h}>
                  Up to {h} h
                </option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem top="Hotel rating" htmlFor="f-rating">
            <NativeSelect id="f-rating" value={filters.minRating} onChange={(_, v) => setF({ minRating: Number(v) })}>
              {[8, 8.5, 9].map((r) => (
                <option key={r} value={r}>
                  {r.toFixed(1)} or higher
                </option>
              ))}
            </NativeSelect>
          </FormItem>
          <FormItem top="Distance from centre" htmlFor="f-km">
            <NativeSelect id="f-km" value={filters.maxKm} onChange={(_, v) => setF({ maxKm: Number(v) })}>
              {[1, 2, 3].map((k) => (
                <option key={k} value={k}>
                  Within {k} km
                </option>
              ))}
            </NativeSelect>
          </FormItem>
          {hasNightsRange && (
            <FormItem top={`Nights: ${Math.max(filters.nights[0], nightsRange[0])}–${Math.min(filters.nights[1], nightsRange[1])}`}>
              <div className="px-2 py-2">
                <Slider multiple min={nightsRange[0]} max={nightsRange[1]} step={1} value={[Math.max(filters.nights[0], nightsRange[0]), Math.min(filters.nights[1], nightsRange[1])]} onChange={(v) => Array.isArray(v) && setF({ nights: v })} getAriaLabel={(i) => (i === 0 ? "Fewest nights" : "Most nights")} />
              </div>
            </FormItem>
          )}
          <div className="flex flex-col px-1 pb-2">
            <Checkbox checked={filters.direct} onCheckedChange={(v) => setF({ direct: v === true })}>
              Direct flights only
            </Checkbox>
            <Checkbox checked={filters.breakfast} onCheckedChange={(v) => setF({ breakfast: v === true })}>
              Breakfast included
            </Checkbox>
            <Checkbox checked={filters.refundable} onCheckedChange={(v) => setF({ refundable: v === true })}>
              Free cancellation
            </Checkbox>
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {wantTrips ? (
            <SegmentedControl
              aria-label="Result type"
              className="w-64"
              value={view}
              onChange={(v) => setView(v as typeof view)}
              options={[
                { value: "trips", label: "Complete trips" },
                { value: "flights", label: "Flights only" },
              ]}
            />
          ) : (
            <p className="text-headline-2 font-medium">One-way flights</p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-subhead text-muted-foreground">
              All date options
              <Switch checked={allOptions} onCheckedChange={setAllOptions} />
            </label>
            {view === "trips" ? (
              <NativeSelect aria-label="Sort trips" value={sort} onChange={(_, v) => setSort(v as TripSort)}>
                <option value="cheapest">Cheapest total</option>
                <option value="value">Best value</option>
                <option value="convenient">Most convenient</option>
              </NativeSelect>
            ) : (
              <NativeSelect aria-label="Sort flights" value={flightSort} onChange={(_, v) => setFlightSort(v as FlightSort)}>
                <option value="cheapest">Cheapest</option>
                <option value="shortest">Shortest duration</option>
                <option value="stops">Fewest stops</option>
                <option value="value">Best overall value</option>
              </NativeSelect>
            )}
          </div>
        </div>

        {params.cabin !== "economy" && <p className="rounded-md bg-secondary px-3 py-2 text-footnote text-muted-foreground">Flight prices shown are economy fares. Choose {params.cabin} on the booking site to see its price.</p>}
        {search.failedQueries > 0 && <p className="rounded-md bg-secondary px-3 py-2 text-footnote text-muted-foreground">Some flight lookups failed, so a few routes may be missing. Search again to retry them.</p>}

        {view === "flights" ? (
          <>
            <p className="text-footnote text-muted-foreground">
              {travellers(params) > 1 ? `Totals are the single-adult fare × ${travellers(params)} travellers; the booking site confirms the exact price. ` : ""}Times are local departure times.
            </p>
            {flightRows.map((r) => (
              <FlightCard key={r.flight.id} flight={r.flight} destination={r.destination} />
            ))}
          </>
        ) : !search.hotelsConfigured || hotelStatus === "not_configured" ? (
          <>
            <ProviderNotice kind="hotels" status="not_configured" />
            <Button variant="secondary" appearance="neutral" onClick={() => setView("flights")} className="self-center">
              Show the {search.results.length} flight results
            </Button>
          </>
        ) : (
          <>
            <p className="text-footnote text-muted-foreground" role="status">
              {pending
                ? `Pricing hotels for ${pending} destination${pending > 1 ? "s" : ""}…`
                : `${shown.length} trip${shown.length === 1 ? "" : "s"} from ${allTrips.length} priced combinations${trips.length ? `, from ${money(Math.min(...trips.map((t) => t.total)), params.currency)}` : ""}.`}
              {params.adults + params.children > 1 ? " Flight totals are estimated from single-adult fares." : ""}
            </p>
            {shown.map((t) => (
              <TripCard key={t.id} trip={t} labels={labels.get(t.id)} />
            ))}
            {search.results
              .filter((r) => dests[r.destination.code]?.state === "loading")
              .map((r) => (
                <div key={r.destination.code} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5" aria-busy="true">
                  <div>
                    <p className="text-headline-1 font-semibold">{r.destination.city}</p>
                    <p className="text-subhead text-muted-foreground">Flights from {money(r.offers[0].totalPrice, r.offers[0].currency)} · finding hotels…</p>
                  </div>
                  <Skeleton width={96} height={32} borderRadius={8} />
                </div>
              ))}
            {!pending && hotelStatus && hotelStatus !== "ok" && !allTrips.length && <ProviderNotice kind="hotels" status={hotelStatus} />}
            {!pending && !shown.length && (!hotelStatus || allTrips.length > 0) && (
              <Placeholder icon={<SearchX className="size-8" />} title={allTrips.length ? "No trips match these filters" : "No hotels matched for these dates"}>
                {allTrips.length ? "Loosen a filter to see more." : "No hotel rated 8.0+ within 3 km had availability. Try other dates or switch to Flights only."}
              </Placeholder>
            )}
            {!pending && unpriced > 0 && allTrips.length > 0 && (
              <p className="rounded-md bg-secondary px-3 py-2 text-footnote text-muted-foreground">
                Hotels for {unpriced} destination{unpriced > 1 ? "s" : ""} couldn&apos;t be priced just now, so {unpriced > 1 ? "they are" : "it is"} missing from this list. Search again to retry.
              </p>
            )}
            {!pending && top.length > 0 && <AskPanel trips={top} suggestions={["Which of these is the best deal, and why?", "Compare the top two trips", "Which is best for a relaxed break?"]} />}
          </>
        )}

        {more && !pending && (
          <Button
            variant="secondary"
            appearance="neutral"
            loading={loadingMore}
            className="self-center"
            onClick={async () => {
              setLoadingMore(true);
              await load(search.results.length);
              setLoadingMore(false);
            }}
          >
            Show more destinations ({search.totalDestinations - search.results.length} left)
          </Button>
        )}
      </section>
    </div>
  );
}
