import { Placeholder } from "datui";
import { KeyRound, TriangleAlert } from "lucide-react";
import type { ProviderStatus } from "@/types/trip";

const SETUP = {
  flights: { name: "Flight search", vars: "TRAVELPAYOUTS_TOKEN and TRAVELPAYOUTS_MARKER", where: "travelpayouts.com (join the Aviasales program)" },
  hotels: { name: "Hotel search", vars: "LITEAPI_KEY and LITEAPI_WHITELABEL_DOMAIN", where: "connect.nuitee.com" },
};

/** Shown instead of results when a provider can't answer. Never replaced with sample data. */
export function ProviderNotice({ kind, status }: { kind: keyof typeof SETUP; status: ProviderStatus }) {
  const s = SETUP[kind];
  if (status === "not_configured")
    return (
      <Placeholder icon={<KeyRound className="size-8" />} title={`${s.name} isn't connected yet`}>
        Add <code className="font-mono text-footnote">{s.vars}</code> to <code className="font-mono text-footnote">.env.local</code> (keys from {s.where}) and restart. dattrip only shows real offers, so there is nothing to display until then.
      </Placeholder>
    );
  return (
    <Placeholder icon={<TriangleAlert className="size-8" />} title={status === "rate_limited" ? `${s.name} is rate-limited` : `${s.name} is unavailable`}>
      {status === "rate_limited" ? "The provider asked us to slow down. Try again in a minute." : "The provider didn't answer. Try again shortly."}
    </Placeholder>
  );
}
