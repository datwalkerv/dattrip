import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl pt-12">
      <h1 className="text-title-1 font-semibold tracking-tight">This page isn&apos;t here</h1>
      <p className="mt-3 text-paragraph text-muted-foreground">If you followed a trip link, it may have expired. Prices and dates change, so search again for the latest offers.</p>
      <LinkButton href="/" className="mt-6">
        Find a trip
      </LinkButton>
    </div>
  );
}
