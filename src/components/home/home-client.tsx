"use client";

import { Button, SegmentedControl } from "datui";
import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiBox } from "@/components/search/ai-box";
import { type DraftPatch, SearchForm } from "@/components/search/search-form";
import { CATALOGUE } from "@/lib/catalogue";
import { type Prefs, readPrefs } from "@/lib/prefs";
import { type SearchParamsInput, SearchParamsSchema, toQuery } from "@/lib/search-params";
import { DestinationExplorer } from "./destination-explorer";

const tagged = (tag: string) => CATALOGUE.filter((d) => d.tags?.includes(tag)).map((d) => d.code);

/** One-tap starting points. They only set search criteria: where, how long. */
const QUICK_STARTS: { label: string; values: (from: string[]) => Partial<SearchParamsInput> }[] = [
  { label: "Anywhere, 3–5 nights", values: () => ({ to: [], minNights: 3, maxNights: 5 }) },
  { label: "Winter sun", values: (from) => ({ to: tagged("winter-sun").filter((c) => !from.includes(c)).slice(0, 8), minNights: 5, maxNights: 7 }) },
  { label: "Weekend city break", values: (from) => ({ to: ["PRG", "ROM", "PAR", "LON", "AMS", "BER", "CPH", "KRK", "VIE"].filter((c) => !from.includes(c)).slice(0, 8), minNights: 2, maxNights: 3 }) },
  { label: "Beach week", values: (from) => ({ to: tagged("beach").filter((c) => !from.includes(c)).slice(0, 8), minNights: 6, maxNights: 8 }) },
];

/** The interactive part of the homepage: the search card, quick starts and the destination explorer share one draft. */
export function HomeClient({ preset, month }: { preset?: Partial<SearchParamsInput>; /** Next month, computed on the server so both renders agree. */ month: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"search" | "ai">("search");
  const [patch, setPatch] = useState<DraftPatch>({ key: 0, values: {} });
  const [prefs, setPrefs] = useState<Prefs>();
  const [aiText, setAiText] = useState("");

  useEffect(() => {
    const p = readPrefs();
    if (!p) return;
    // Read after mount: the server can't see what this browser remembers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(p);
    setPatch((prev) => ({ key: prev.key + 1, values: p }));
  }, []);

  const toForm = (focusFrom: boolean) => {
    setMode("search");
    requestAnimationFrame(() => {
      const card = document.getElementById("search");
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusFrom) card?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  };

  /** Fill fields in. With a remembered departure airport that is already a complete search, so run it. */
  const apply = (values: Partial<SearchParamsInput>, run: boolean) => {
    const full = SearchParamsSchema.safeParse({ ...prefs, month, ...values });
    if (run && full.success) return router.push(`/search?${toQuery(full.data)}`);
    setPatch((prev) => ({ key: prev.key + 1, values }));
    toForm(!prefs);
  };

  return (
    <>
      <section id="search" aria-label="Search" className="rise relative z-10 mx-auto -mt-24 max-w-4xl scroll-mt-24 px-2 [animation-delay:160ms] tablet:-mt-32 tablet:px-0">
        <div className="rounded-2xl border border-border bg-card p-2 shadow-lg tablet:p-3">
          <div className="px-3 pb-1 pt-2">
            <SegmentedControl
              aria-label="How to search"
              className="w-full tablet:w-[26rem]"
              value={mode}
              onChange={(v) => setMode(v as typeof mode)}
              options={[
                { value: "search", label: "Search", before: <Search className="size-4" /> },
                {
                  value: "ai",
                  label: (
                    <>
                      Describe<span className="hidden tablet:inline"> your trip</span>
                    </>
                  ),
                  before: <Sparkles className="size-4" />,
                },
              ]}
            />
          </div>
          {/* The form stays mounted so switching tabs never loses what was typed. */}
          <div hidden={mode !== "search"}>
            <SearchForm bare remember initial={preset} patch={patch} />
          </div>
          {/* Mounted only while shown: the text box sizes itself on mount and can't measure while hidden. */}
          {mode === "ai" && <AiBox text={aiText} onText={setAiText} onPartial={(values) => apply(values, false)} />}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="text-footnote text-muted-foreground">Try</span>
          {QUICK_STARTS.map((q) => (
            <Button key={q.label} size="s" variant="outline" appearance="neutral" rounded onClick={() => apply(q.values(prefs?.from ?? []), true)}>
              {q.label}
            </Button>
          ))}
        </div>
      </section>

      <DestinationExplorer from={prefs?.from} month={month} onPick={(code) => apply({ to: [code] }, false)} />
    </>
  );
}
