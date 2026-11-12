"use client";

import { type ChipOption, ChipsSelect } from "datui";
import { useEffect, useRef, useState } from "react";
import { labelFor } from "@/lib/labels";
import type { Place } from "@/types/flight";

const toOption = (p: Place): ChipOption =>
  p.type === "country"
    ? { value: `c:${p.code}`, label: `${p.name} (country)` }
    : { value: p.code, label: p.type === "airport" ? `${p.name} (${p.code}), ${p.cityName ?? p.countryName}` : `${p.name} (${p.code}), ${p.countryName}` };

/** Short chip text: "Budapest (BUD)" rather than the full option line. */
const chipLabel = (o: ChipOption) => o.label.replace(/\),.*$/, ")").replace(" (country)", "");

/** Multi-select of cities, airports and (optionally) countries with server-side autocomplete. */
/** Stand-in chip shown while nothing is chosen (the "Anywhere" destination). Never passed to onChange. */
const EMPTY = "*";

export function PlaceSelect({
  value,
  onChange,
  countries = false,
  placeholder,
  emptyLabel,
  id,
  labelledBy,
  invalid,
}: {
  value: string[];
  onChange: (codes: string[]) => void;
  countries?: boolean;
  placeholder: string;
  /** When set, an empty selection shows as a chip with this label instead of a blank field. */
  emptyLabel?: string;
  id?: string;
  labelledBy?: string;
  invalid?: boolean;
}) {
  const [options, setOptions] = useState<ChipOption[]>([]);
  const [fetching, setFetching] = useState(false);
  // Remember labels of what was picked this session; codes from the URL fall back to the catalogue.
  const [labels, setLabels] = useState<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const search = (q: string) => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setOptions([]);
      setFetching(false);
      return;
    }
    setFetching(true);
    timer.current = setTimeout(async () => {
      const mine = ++request.current;
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}${countries ? "&countries=1" : ""}`);
        const data = (await res.json()) as { places?: Place[] };
        if (mine === request.current) setOptions((data.places ?? []).map(toOption));
      } catch {
        if (mine === request.current) setOptions([]);
      } finally {
        if (mine === request.current) setFetching(false);
      }
    }, 200);
  };

  return (
    <ChipsSelect
      id={id}
      aria-labelledby={labelledBy}
      status={invalid ? "error" : undefined}
      value={value.length || !emptyLabel ? value.map((code) => ({ value: code, label: labels[code] ?? labelFor(code) })) : [{ value: EMPTY, label: emptyLabel }]}
      onChange={(all) => {
        const chips = all.filter((c) => c.value !== EMPTY);
        setLabels((prev) => ({ ...Object.fromEntries(chips.map((c) => [String(c.value), chipLabel(c)])), ...prev }));
        onChange(chips.map((c) => String(c.value)));
      }}
      options={options}
      filterFn={false}
      fetching={fetching}
      fetchingLabel="Searching…"
      emptyText="Type a city, airport or code"
      onInputChange={search}
      placeholder={value.length || emptyLabel ? "" : placeholder}
      closeAfterSelect
    />
  );
}
