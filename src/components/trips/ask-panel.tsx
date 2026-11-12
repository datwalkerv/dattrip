"use client";

import { Button, Textarea } from "datui";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { tripDigest } from "@/lib/trip/digest";
import type { Trip } from "@/types/trip";

const ERRORS: Record<string, string> = {
  not_configured: "The AI assistant isn't set up on this site (GEMINI_API_KEY is missing). Everything else works without it.",
  rate_limited: "The AI is busy right now. Try again in a minute.",
};

/** Questions about the trips on screen. The model only sees these trips' real data and is told not to add facts. */
export function AskPanel({ trips, suggestions }: { trips: Trip[]; suggestions: string[] }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async (q: string) => {
    if (q.trim().length < 3 || busy) return;
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/ai/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question: q, trips: trips.slice(0, 6).map(tripDigest) }) });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (res.ok && data.answer) setAnswer(data.answer);
      else setError(ERRORS[data.error ?? ""] ?? "The AI couldn't answer that. Try again.");
    } catch {
      setError("Couldn't reach the AI.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4 tablet:p-5" aria-labelledby="ask-title">
      <h2 id="ask-title" className="flex items-center gap-2 text-headline-1 font-semibold">
        <Sparkles className="size-4" aria-hidden /> Ask about {trips.length > 1 ? "these trips" : "this trip"}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Button
            key={s}
            size="s"
            variant="secondary"
            appearance="neutral"
            rounded
            disabled={busy}
            onClick={() => {
              setQuestion(s);
              ask(s);
            }}
          >
            {s}
          </Button>
        ))}
      </div>
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <Textarea aria-label="Your question" rows={1} grow maxLength={400} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about what's shown" />
        <Button type="submit" loading={busy} disabled={question.trim().length < 3}>
          Ask
        </Button>
      </form>
      <div role="status" className="mt-3 min-h-5 text-paragraph">
        {answer && <p className="fade-in whitespace-pre-line">{answer}</p>}
        {error && <p className="text-muted-foreground">{error}</p>}
      </div>
      {answer && <p className="mt-2 text-caption-1 text-muted-foreground">AI summary of the prices above. Check details on the booking sites.</p>}
    </section>
  );
}
