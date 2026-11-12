"use client";

import { Button } from "datui";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSyncExternalStore } from "react";
import { isSaved, removeSaved, saveTrip, subscribeSaved } from "@/lib/saved";
import type { Trip } from "@/types/trip";

export function SaveButton({ trip }: { trip: Trip }) {
  const saved = useSyncExternalStore(
    subscribeSaved,
    () => isSaved(trip.id),
    () => false,
  );
  return (
    <Button variant="outline" appearance="neutral" aria-pressed={saved} before={saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />} onClick={() => (saved ? removeSaved(trip.id) : saveTrip(trip))}>
      {saved ? "Saved" : "Save trip"}
    </Button>
  );
}
