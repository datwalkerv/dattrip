"use client";

import { Button } from "datui";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { dayLabel, monthLabel } from "@/lib/format";
import { labelFor } from "@/lib/labels";
import type { SearchParams } from "@/lib/search-params";
import { SearchForm } from "./search-form";

export function datesText(p: SearchParams) {
  if (p.dateMode === "month") return `${monthLabel(p.month!)}${p.tripType === "return" ? ` · ${p.minNights === p.maxNights ? p.minNights : `${p.minNights}–${p.maxNights}`} nights` : ""}`;
  const flex = p.dateMode === "flex" ? ` ± ${p.flexDays} day${p.flexDays > 1 ? "s" : ""}` : "";
  return `${dayLabel(p.depart!)}${p.ret ? ` – ${dayLabel(p.ret)}` : ""}${flex}`;
}

/** What was searched, with the full form one click away so the search can be changed in place. */
export function SearchSummary({ params }: { params: SearchParams }) {
  const [editing, setEditing] = useState(false);
  const pax = params.adults + params.children;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-title-1 font-semibold tracking-tight">
            {params.from.map(labelFor).join(", ")} → {params.to.length ? params.to.map(labelFor).join(", ") : "Anywhere"}
          </h1>
          <p className="text-subhead text-muted-foreground">
            {datesText(params)} · {pax} traveller{pax > 1 ? "s" : ""}
            {params.direct ? " · direct only" : ""}
            {params.maxBudget ? ` · up to ${params.maxBudget} ${params.currency}` : ""}
          </p>
        </div>
        <Button variant="outline" appearance="neutral" before={<Pencil className="size-4" />} onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
          {editing ? "Close" : "Edit search"}
        </Button>
      </div>
      {editing && <SearchForm initial={params} submitLabel="Update results" />}
    </div>
  );
}
