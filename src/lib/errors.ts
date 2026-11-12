export type ProviderErrorCode = "not_configured" | "rate_limited" | "upstream";

export class ProviderError extends Error {
  constructor(
    public provider: string,
    public code: ProviderErrorCode,
    message?: string,
  ) {
    super(message ?? `${provider}: ${code}`);
  }
}

export const statusOf = (e: unknown) => (e instanceof ProviderError ? (e.code === "upstream" ? "error" : e.code) : "error");

/** fetch → JSON with a timeout; maps HTTP failures to ProviderError. */
export async function fetchJson(provider: string, url: string, init: RequestInit = {}): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000), cache: "no-store" });
  } catch (e) {
    throw new ProviderError(provider, "upstream", `${provider}: ${e instanceof Error ? e.message : "network error"}`);
  }
  if (res.status === 204) return null;
  if (res.status === 429) throw new ProviderError(provider, "rate_limited");
  if (res.status === 401 || res.status === 403) throw new ProviderError(provider, "not_configured", `${provider}: key rejected (${res.status})`);
  if (!res.ok) throw new ProviderError(provider, "upstream", `${provider}: HTTP ${res.status}`);
  return res.json().catch(() => {
    throw new ProviderError(provider, "upstream", `${provider}: invalid JSON`);
  });
}
