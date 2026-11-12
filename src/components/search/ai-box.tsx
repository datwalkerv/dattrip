"use client";

import { Button, Textarea } from "datui";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SearchParamsInput, SearchParamsSchema, toQuery } from "@/lib/search-params";

const EXAMPLES = ["A cheap long weekend from Vienna next month", "Beach week for 2 adults and 2 kids from Budapest in June", "Direct flights only, a city break under €400"];

const MESSAGES: Record<string, string> = {
  not_configured: "AI search isn't set up on this site yet. The Search tab works without it.",
  rate_limited: "The AI is busy right now. Try again in a minute, or use the Search tab.",
};

/** Natural-language search. Gemini only fills in the form; prices always come from the providers. */
export function AiBox({ text, onText, onPartial }: { /** Held by the parent so the draft survives switching tabs. */ text: string; onText: (t: string) => void; onPartial: (p: Partial<SearchParamsInput>) => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 3 || busy) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/ai/parse", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      const data = (await res.json()) as { params?: Partial<SearchParamsInput>; error?: string };
      if (!res.ok || !data.params) return setNote(MESSAGES[data.error ?? ""] ?? "The AI couldn't read that. Try rephrasing, or use the Search tab.");
      const full = SearchParamsSchema.safeParse(data.params);
      if (full.success) return router.push(`/search?${toQuery(full.data)}`);
      onPartial(data.params);
      
    } catch {
      setNote("Couldn't reach the AI. The Search tab works without it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={run} className="flex flex-col gap-3 p-3">
      <Textarea
        aria-label="Describe the trip you want"
        rows={3}
        maxLength={500}
        value={text}
        onChange={(e) => onText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && run(e)}
        placeholder="Somewhere warm from Budapest in March, 4–6 nights, with breakfast"
      />
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <Button key={ex} type="button" size="s" variant="secondary" appearance="neutral" rounded onClick={() => onText(ex)}>
            {ex}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <p className="min-h-4 text-footnote text-muted-foreground" role="status">
          {note || "The AI only fills in the search. Prices always come from the flight and hotel providers."}
        </p>
        <Button type="submit" size="l" loading={busy} disabled={text.trim().length < 3} before={<Sparkles className="size-4" />} className="tablet:min-w-56">
          Find trips
        </Button>
      </div>
    </form>
  );
}
