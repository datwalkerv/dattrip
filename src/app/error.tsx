"use client";

import { Button } from "datui";
import { LinkButton } from "@/components/link-button";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto max-w-2xl pt-12">
      <h1 className="text-title-1 font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-paragraph text-muted-foreground">A price provider may be slow or unavailable right now. Try again in a moment.</p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <LinkButton href="/" variant="secondary">
          Home
        </LinkButton>
      </div>
    </div>
  );
}
