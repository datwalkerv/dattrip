"use client";

import { Button, type CalendarRangeValue, DateInput, DateRangeInput, FormItem, IconButton, Input, NativeSelect, Popover, SegmentedControl, Slider, Switch } from "datui";
import { ChevronDown, Minus, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { monthLabel } from "@/lib/format";
import { CABINS, CURRENCIES, type SearchParamsInput, SearchParamsSchema, toQuery } from "@/lib/search-params";
import { PlaceSelect } from "./place-select";

type Draft = SearchParamsInput & { to: string[] };

const pad = (n: number) => String(n).padStart(2, "0");
const toDay = (d: Date | null | undefined) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : undefined);
const fromDay = (s?: string) => (s ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) : null);

function nextMonths(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  });
}

export const defaultDraft = (over: Partial<SearchParamsInput> = {}): Draft => ({
  from: [],
  tripType: "return",
  dateMode: "month",
  month: nextMonths(2)[1],
  flexDays: 2,
  minNights: 3,
  maxNights: 5,
  adults: 2,
  children: 0,
  cabin: "economy",
  direct: false,
  currency: "EUR",
  ...over,
  to: over.to ?? [],
});

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-subhead">{label}</span>
      <div className="flex items-center gap-2">
        <IconButton size="s" label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus className="size-4" />
        </IconButton>
        <span className="tabular w-5 text-center text-headline-2" aria-live="polite">
          {value}
        </span>
        <IconButton size="s" label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

/** The search form. Used large on the homepage and inline on the results page; state goes to the URL on submit. */
export function SearchForm({ initial, submitLabel = "Search trips" }: { initial?: Partial<SearchParamsInput>; submitLabel?: string }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => defaultDraft(initial));
  const [anywhere, setAnywhere] = useState(!initial?.to?.length);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  // Date pickers mark "today", which differs between the server render and the browser.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const set = (patch: Partial<Draft>) => {
    setD((prev) => ({ ...prev, ...patch }));
    // A fixed field shouldn't keep showing its error until the next submit.
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !(k in patch))));
  };
  const months = nextMonths();
  const isReturn = d.tripType !== "oneway";
  const pax = (d.adults ?? 2) + (d.children ?? 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate = { ...d, to: anywhere ? [] : d.to, maxBudget: d.maxBudget || undefined };
    const r = SearchParamsSchema.safeParse(candidate);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    if (!anywhere && !d.to.length) {
      setErrors({ to: "Add a destination or switch to Anywhere" });
      return;
    }
    setErrors({});
    setPending(true);
    router.push(`/search?${toQuery(r.data)}`);
  };

  const range: CalendarRangeValue = [fromDay(d.depart), fromDay(d.ret)];

  return (
    <form onSubmit={submit} noValidate className="rounded-xl border border-border bg-card p-2 shadow-md tablet:p-3">
      <div className="grid items-end gap-x-2 tablet:grid-cols-2">
        <FormItem top="From" topId="from-label" status={errors.from ? "error" : undefined} bottom={errors.from}>
          <PlaceSelect labelledBy="from-label" value={d.from} onChange={(from) => set({ from })} placeholder="Budapest, Vienna…" invalid={!!errors.from} />
        </FormItem>
        <FormItem
          top={
            <span className="flex items-center justify-between gap-3">
              <span id="to-label">To</span>
              <SegmentedControl
                aria-label="Destination mode"
                className="w-56"
                value={anywhere ? "anywhere" : "choose"}
                onChange={(v) => setAnywhere(v === "anywhere")}
                options={[
                  { value: "anywhere", label: "Anywhere" },
                  { value: "choose", label: "Choose" },
                ]}
              />
            </span>
          }
          status={errors.to ? "error" : undefined}
          bottom={errors.to}
        >
          {anywhere ? (
            <div className="flex min-h-11 items-center rounded-md border border-dashed border-border px-3 text-subhead text-muted-foreground">The cheapest complete trips, wherever they are</div>
          ) : (
            <PlaceSelect labelledBy="to-label" countries value={d.to} onChange={(to) => set({ to })} placeholder="Cities or countries to compare" invalid={!!errors.to} />
          )}
        </FormItem>
      </div>

      <div className="grid gap-x-2 tablet:grid-cols-[auto_1fr]">
        <FormItem top="Trip">
          <SegmentedControl
            aria-label="Trip type"
            className="min-w-52"
            value={d.tripType ?? "return"}
            onChange={(v) => set({ tripType: v as Draft["tripType"] })}
            options={[
              { value: "return", label: "Return" },
              { value: "oneway", label: "One-way" },
            ]}
          />
        </FormItem>
        <FormItem top="Dates">
          <SegmentedControl
            aria-label="Date mode"
            value={d.dateMode ?? "month"}
            onChange={(v) => set({ dateMode: v as Draft["dateMode"] })}
            options={[
              { value: "month", label: "Whole month" },
              { value: "exact", label: "Exact dates" },
              { value: "flex", label: "Flexible" },
            ]}
          />
        </FormItem>
      </div>

      {d.dateMode === "month" || !d.dateMode ? (
        <div className="grid gap-x-2 tablet:grid-cols-3">
          <FormItem top="Depart in" htmlFor="month" status={errors.month ? "error" : undefined} bottom={errors.month}>
            <NativeSelect id="month" value={d.month ?? ""} onChange={(_, month) => set({ month, retMonth: d.retMonth && d.retMonth < month ? undefined : d.retMonth })}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </NativeSelect>
          </FormItem>
          {isReturn && (
            <>
              <FormItem top="Return in" htmlFor="ret-month" status={errors.retMonth ? "error" : undefined} bottom={errors.retMonth}>
                <NativeSelect id="ret-month" value={d.retMonth ?? ""} onChange={(_, m) => set({ retMonth: m || undefined })}>
                  <option value="">Any time that fits</option>
                  {months
                    .filter((m) => !d.month || m >= d.month)
                    .map((m) => (
                      <option key={m} value={m}>
                        {monthLabel(m)}
                      </option>
                    ))}
                </NativeSelect>
              </FormItem>
              <FormItem top={`Stay ${d.minNights === d.maxNights ? d.minNights : `${d.minNights}–${d.maxNights}`} nights`} topId="nights-label" status={errors.maxNights ? "error" : undefined} bottom={errors.maxNights}>
                <div className="flex min-h-11 items-center px-2">
                  <Slider
                    multiple
                    min={1}
                    max={14}
                    step={1}
                    value={[d.minNights ?? 3, d.maxNights ?? 5]}
                    onChange={(v) => Array.isArray(v) && set({ minNights: v[0], maxNights: v[1] })}
                    getAriaLabel={(i) => (i === 0 ? "Shortest stay in nights" : "Longest stay in nights")}
                    className="w-full"
                  />
                </div>
              </FormItem>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-x-2 tablet:grid-cols-[2fr_1fr]">
          <FormItem top={isReturn ? "Departure – return" : "Departure"} topId="dates-label" status={errors.depart || errors.ret ? "error" : undefined} bottom={errors.depart ?? errors.ret}>
            {!mounted ? (
              <div className="h-11" />
            ) : isReturn ? (
              <DateRangeInput aria-labelledby="dates-label" disablePast value={range} onChange={([a, b]) => set({ depart: toDay(a), ret: toDay(b) })} />
            ) : (
              <DateInput aria-labelledby="dates-label" disablePast value={range[0]} onChange={(a) => set({ depart: toDay(a), ret: undefined })} />
            )}
          </FormItem>
          {d.dateMode === "flex" && (
            <FormItem top="Flexibility" htmlFor="flex">
              <NativeSelect id="flex" value={d.flexDays ?? 2} onChange={(_, v) => set({ flexDays: Number(v) })}>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    ± {n} day{n > 1 ? "s" : ""}
                  </option>
                ))}
              </NativeSelect>
            </FormItem>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 px-3 pb-2 pt-2 tablet:flex-row tablet:items-center tablet:justify-between">
        <Popover
          placement="bottom-start"
          content={
            <div className="flex w-72 flex-col gap-4 p-4">
              <Stepper label="Adults" value={d.adults ?? 2} min={1} max={9} onChange={(adults) => set({ adults })} />
              <Stepper label="Children" value={d.children ?? 0} min={0} max={6} onChange={(children) => set({ children })} />
              <label className="flex items-center justify-between gap-6 text-subhead">
                Direct flights only
                <Switch checked={!!d.direct} onCheckedChange={(direct) => set({ direct })} />
              </label>
              <label className="flex flex-col gap-1.5 text-subhead">
                Cabin
                <NativeSelect value={d.cabin ?? "economy"} onChange={(_, v) => set({ cabin: v as Draft["cabin"] })}>
                  {CABINS.map((c) => (
                    <option key={c} value={c}>
                      {c[0].toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </NativeSelect>
                {d.cabin && d.cabin !== "economy" && <span className="text-footnote text-muted-foreground">Prices shown are economy fares; choose the cabin on the booking site.</span>}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-subhead">
                  Currency
                  <NativeSelect value={d.currency ?? "EUR"} onChange={(_, v) => set({ currency: v as Draft["currency"] })}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="flex flex-col gap-1.5 text-subhead">
                  Max budget
                  <Input type="number" inputMode="numeric" min={0} placeholder="Any" value={d.maxBudget ?? ""} onChange={(e) => set({ maxBudget: e.target.value ? Number(e.target.value) : undefined })} />
                </label>
              </div>
            </div>
          }
        >
          <Button type="button" variant="outline" appearance="neutral" size="l" after={<ChevronDown className="size-4" />}>
            {pax} traveller{pax > 1 ? "s" : ""} · {d.currency}
            {d.direct ? " · Direct" : ""}
            {d.maxBudget ? ` · max ${d.maxBudget}` : ""}
          </Button>
        </Popover>
        <Button type="submit" size="l" loading={pending} before={<Search className="size-4" />} className="tablet:min-w-44">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
