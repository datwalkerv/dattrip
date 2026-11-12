import { unstable_cache } from "next/cache";

const inflight = new Map<string, Promise<unknown>>();

/**
 * In-flight dedupe → Next.js data cache (shared across serverless instances) → loader.
 * `fresh` skips the stored value (used right before sending someone to a booking page).
 */
export function cached<T>(key: string, ttlSec: number, loader: () => Promise<T>, fresh = false): Promise<T> {
  const k = fresh ? `fresh:${key}` : key;
  const pending = inflight.get(k) as Promise<T> | undefined;
  if (pending) return pending;
  const run = (fresh ? loader() : persistent(key, ttlSec, loader)).finally(() => inflight.delete(k));
  inflight.set(k, run);
  return run;
}

async function persistent<T>(key: string, ttlSec: number, loader: () => Promise<T>): Promise<T> {
  let called = false;
  const wrapped = async () => {
    called = true;
    return { at: Date.now(), value: await loader() };
  };
  let hit: { at: number; value: T };
  try {
    hit = await unstable_cache(wrapped, ["dattrip", key], { revalidate: ttlSec })();
  } catch (e) {
    // Outside a Next.js request (tests, scripts) the data cache is unavailable.
    if (!called) return loader();
    throw e;
  }
  // The data cache hands back an expired entry once while it refreshes in the background.
  // A price that old must not be shown as current, so fetch it now instead.
  return Date.now() - hit.at > ttlSec * 1000 ? loader() : hit.value;
}
