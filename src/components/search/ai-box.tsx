"use client";

import { Button, Textarea } from "datui";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type SearchParamsInput, SearchParamsSchema, toQuery } from "@/lib/search-params";

const MESSAGES: Record<string, string> = {
  not_configured: "AI search isn't set up on this site yet. The form below works without it.",
  rate_limited: "The AI is busy right now. Try again in a minute, or use the form below.",
};

/** Natural-language search. Gemini only fills in the form; prices always come from the providers. */
export function AiBox({ onPartial }: { onPartial: (p: Partial<SearchParamsInput>) => void }) {
  const router = useRouter();
  const [text, setText] = useState("");
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
      if (!res.ok || !data.params) return setNote(MESSAGES[data.error ?? ""] ?? "The AI couldn't read that. Try rephrasing, or use the form below.");
      const full = SearchParamsSchema.safeParse(data.params);
      if (full.success) return router.push(`/search?${toQuery(full.data)}`);
      onPartial(data.params);
      setNote(data.params.from?.length ? "I filled in what I understood. Check the form and search." : "I filled in what I understood. Add where you're flying from and search.");
    } catch {
      setNote("Couldn't reach the AI. The form below works without it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={run} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Textarea
          aria-label="Describe the trip you want"
          rows={1}
          grow
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && run(e)}
          placeholder="Or describe it: “Somewhere warm from Budapest in March, 4–6 nights, with breakfast”"
          before={<Sparkles className="size-4 text-muted-foreground" aria-hidden />}
        />
        <Button type="submit" variant="secondary" appearance="neutral" size="l" loading={busy} disabled={text.trim().length < 3}>
          Ask
        </Button>
      </div>
      <p className="min-h-4 px-1 text-footnote text-muted-foreground" role="status">
        {note}
      </p>
    </form>
  );
}
