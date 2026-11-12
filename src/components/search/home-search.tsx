"use client";

import { useState } from "react";
import type { SearchParamsInput } from "@/lib/search-params";
import { AiBox } from "./ai-box";
import { SearchForm } from "./search-form";

/** Homepage search: the form plus the AI box that can prefill it. */
export function HomeSearch({ initial }: { initial?: Partial<SearchParamsInput> }) {
  const [prefill, setPrefill] = useState<{ n: number; params?: Partial<SearchParamsInput> }>({ n: 0, params: initial });
  return (
    <div className="flex flex-col gap-3">
      {/* Remounting applies the AI's partial answer as the form's new starting state. */}
      <SearchForm key={prefill.n} initial={prefill.params} />
      <AiBox onPartial={(params) => setPrefill((p) => ({ n: p.n + 1, params }))} />
    </div>
  );
}
