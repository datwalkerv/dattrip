import type { Metadata } from "next";
import { SavedList } from "@/components/trips/saved-list";

export const metadata: Metadata = { title: "Saved trips" };

export default function SavedPage() {
  return (
    <div className="mx-auto max-w-3xl pt-10">
      <h1 className="text-title-1 font-semibold tracking-tight">Saved trips</h1>
      <p className="mt-1 text-subhead text-muted-foreground">Kept in this browser. Opening a trip checks its current price.</p>
      <SavedList />
    </div>
  );
}
