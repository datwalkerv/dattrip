import type { Metadata } from "next";
import { SearchForm } from "@/components/search/search-form";
import { SearchSummary } from "@/components/search/search-summary";
import { Results } from "@/components/trips/results";
import { fromQuery, toQuery } from "@/lib/search-params";

export const metadata: Metadata = { title: "Search results" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const parsed = fromQuery(await searchParams);
  if (!parsed.success)
    return (
      <div className="mx-auto max-w-4xl pt-10">
        <h1 className="text-title-1 font-semibold tracking-tight">Let&apos;s fix that search</h1>
        <p className="mb-5 mt-1 text-subhead text-muted-foreground">{parsed.error.issues[0]?.message ?? "Some search details are missing."}</p>
        <SearchForm />
      </div>
    );
  const params = parsed.data;
  const key = toQuery(params);
  return (
    <div className="flex flex-col gap-6 pt-8">
      <SearchSummary key={`s:${key}`} params={params} />
      <Results key={key} params={params} />
    </div>
  );
}
