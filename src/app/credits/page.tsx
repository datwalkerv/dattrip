import type { Metadata } from "next";
import { CATALOGUE } from "@/lib/catalogue";

export const metadata: Metadata = { title: "Photo credits" };

export default function CreditsPage() {
  const credited = CATALOGUE.filter((d) => d.photo && d.photoCredit);
  return (
    <div className="mx-auto max-w-3xl pt-10">
      <h1 className="text-title-1 font-semibold tracking-tight">Photo credits</h1>
      <p className="mt-1 text-subhead text-muted-foreground">Destination photos are credited to their photographers below. Each link goes to the source.</p>
      <ul className="mt-6 flex flex-col divide-y divide-separator rounded-lg border border-border bg-card text-subhead">
        {credited.map((d) => (
          <li key={d.code} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-3">
            <span className="font-medium">{d.city}</span>
            <a href={d.photoCredit!.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              {d.photoCredit!.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
