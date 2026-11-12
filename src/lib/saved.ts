import type { Trip } from "@/types/trip";

const KEY = "dattrip:saved";

/** A saved trip is its id plus what it looked like when saved; opening it re-checks live prices. */
export interface SavedTrip {
  id: string;
  city: string;
  country: string;
  checkin: string;
  checkout: string;
  hotel: string;
  total: number;
  currency: string;
  savedAt: string;
}

export function readSaved(): SavedTrip[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(list: SavedTrip[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
  window.dispatchEvent(new Event("dattrip:saved"));
}

export const isSaved = (id: string) => readSaved().some((s) => s.id === id);
export const removeSaved = (id: string) => write(readSaved().filter((s) => s.id !== id));
export const saveTrip = (t: Trip) =>
  write([
    { id: t.id, city: t.destination.city, country: t.destination.country, checkin: t.hotel.checkin, checkout: t.hotel.checkout, hotel: t.hotel.name, total: t.total, currency: t.currency, savedAt: new Date().toISOString() },
    ...readSaved().filter((s) => s.id !== t.id),
  ]);

/** For useSyncExternalStore: re-read when this tab or another one changes the list. */
export function subscribeSaved(cb: () => void) {
  window.addEventListener("dattrip:saved", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("dattrip:saved", cb);
    window.removeEventListener("storage", cb);
  };
}
