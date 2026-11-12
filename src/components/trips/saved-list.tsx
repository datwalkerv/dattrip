"use client";

import { buttonVariants, IconButton, Placeholder } from "datui";
import { Bookmark, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { dayLabel, money } from "@/lib/format";
import { removeSaved, subscribeSaved, type SavedTrip } from "@/lib/saved";

// useSyncExternalStore needs a stable snapshot, so compare the raw string and parse only when it changes.
let lastRaw = "";
let lastList: SavedTrip[] = [];
function snapshot(): SavedTrip[] {
  const raw = localStorage.getItem("dattrip:saved") ?? "[]";
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      const v = JSON.parse(raw);
      lastList = Array.isArray(v) ? v : [];
    } catch {
      lastList = [];
    }
  }
  return lastList;
}
const EMPTY: SavedTrip[] = [];

export function SavedList() {
  const saved = useSyncExternalStore(subscribeSaved, snapshot, () => EMPTY);
  if (!saved.length)
    return (
      <Placeholder
        icon={<Bookmark className="size-8" />}
        title="Nothing saved yet"
        action={
          <Link href="/" className={buttonVariants({ size: "m" })}>
            Find a trip
          </Link>
        }
      >
        Save a trip from its page to compare it later.
      </Placeholder>
    );
  return (
    <ul className="mt-6 flex flex-col divide-y divide-separator rounded-lg border border-border bg-card">
      {saved.map((s) => (
        <li key={s.id} className="flex items-center gap-2 pr-2">
          <Link href={`/trip/${s.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-4 p-4 hover:bg-secondary/60">
            <div className="min-w-0">
              <p className="text-headline-2 font-medium">
                {s.city} <span className="font-normal text-muted-foreground">{s.country}</span>
              </p>
              <p className="truncate text-subhead text-muted-foreground">
                {dayLabel(s.checkin)} – {dayLabel(s.checkout)} · {s.hotel}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="tabular text-headline-1 font-semibold">{money(s.total, s.currency)}</p>
              <p className="text-caption-1 text-muted-foreground">when saved</p>
            </div>
          </Link>
          <IconButton label={`Remove ${s.city} trip`} onClick={() => removeSaved(s.id)}>
            <Trash2 className="size-4" />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
