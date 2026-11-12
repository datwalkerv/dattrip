// One-off: fills in destination photos in src/lib/catalogue.json from Unsplash.
// Needs UNSPLASH_ACCESS_KEY (free at unsplash.com/developers) in .env.local.
//
//   node --env-file=.env.local scripts/build-catalogue.mts --candidates   fetch 8 options per destination (cached, resumable)
//   node --env-file=.env.local scripts/build-catalogue.mts                write option 0 for every destination
//   node --env-file=.env.local scripts/build-catalogue.mts LIS=2 ROM=4    write those options instead (0-based)
//   node --env-file=.env.local scripts/build-catalogue.mts BUD=https://unsplash.com/photos/...-LiE-pn2fJ5I   use that exact photo
//
// Demo keys allow 50 requests an hour: the script stops before the limit and continues where it left off next run.
// Unsplash's terms: load images from their CDN, credit the photographer, and report each photo you use (done here).
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const key = process.env.UNSPLASH_ACCESS_KEY;
if (!key) throw new Error("Set UNSPLASH_ACCESS_KEY in .env.local");
const file = new URL("../src/lib/catalogue.json", import.meta.url);
const cacheFile = new URL("./.photo-candidates.json", import.meta.url);
const catalogue = JSON.parse(readFileSync(file, "utf8"));
const cache: Record<string, Candidate[]> = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
const args = process.argv.slice(2);
const listOnly = args[0] === "--candidates";
// A pick is an option number, or an Unsplash photo link / id (the id is the last 11 characters of the link).
const picks: Record<string, string> = Object.fromEntries(args.filter((a) => a.includes("=")).map((a) => [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)]));

interface Candidate { id: string; url: string; thumb: string; name: string; profile: string; download: string }
/** Search words, where "city country" finds the wrong thing. */
const QUERY: Record<string, string> = { MLA: "Valletta Malta", TFS: "Tenerife coast", LPA: "Las Palmas Gran Canaria", FNC: "Madeira Funchal", HER: "Heraklion Crete", PMI: "Palma de Mallorca cathedral" };

type Photo = { id: string; urls: { raw: string; small: string }; user: { name: string; links: { html: string } }; links: { download_location: string } };
const toCandidate = (p: Photo): Candidate => ({ id: p.id, url: p.urls.raw, thumb: p.urls.small, name: p.user.name, profile: p.user.links.html, download: p.links.download_location });

let remaining = Infinity;
async function unsplash(url: string) {
  // Leave a few requests spare so a re-pick is still possible in the same hour.
  if (remaining <= 3) throw new Error("Unsplash hourly limit almost used up. Run again in an hour; progress is saved.");
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" } });
  remaining = Number(res.headers.get("x-ratelimit-remaining") ?? remaining);
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}${res.status === 403 ? " (rate limit: run again in an hour)" : ""}`);
  return res.json();
}

async function candidates(d: { code: string; city: string; country: string }): Promise<Candidate[]> {
  if (cache[d.code]) return cache[d.code];
  const q = new URLSearchParams({ query: QUERY[d.code] ?? `${d.city} ${d.country} city`, orientation: "landscape", per_page: "8", content_filter: "high" });
  const j = await unsplash(`https://api.unsplash.com/search/photos?${q}`);
  cache[d.code] = (j.results ?? []).map(toCandidate);
  writeFileSync(cacheFile, JSON.stringify({ ...cache, _reported: [...reported] }, null, 1));
  return cache[d.code];
}

// Photos already fetched are written straight away. Reporting the use to Unsplash needs a request each, so when the
// hourly limit is used up those reports stay pending (in the cache file) and are sent on the next run.
const reported = new Set<string>((cache._reported as unknown as string[]) ?? []);
const pending: Candidate[] = [];

for (const d of catalogue) {
  const pick = picks[d.code] ?? "0";
  const exact = /^\d+$/.test(pick) ? undefined : pick.slice(-11);
  try {
    if (listOnly) {
      await candidates(d);
      continue;
    }
    const known = exact ? Object.values(cache).flat().find((c) => c?.id === exact) : undefined;
    const hit = known ?? (exact ? toCandidate(await unsplash(`https://api.unsplash.com/photos/${encodeURIComponent(exact)}`)) : (await candidates(d))[Number(pick)]);
    if (!hit) {
      console.error(`${d.code}: no photo found`);
      continue;
    }
    if (!reported.has(hit.id)) pending.push(hit);
    if (d.photoId === hit.id) continue;
    d.photo = hit.url;
    d.photoId = hit.id;
    d.photoCredit = { name: `${hit.name} / Unsplash`, url: `${hit.profile}?utm_source=dattrip&utm_medium=referral` };
    console.log(`${d.code}: ${hit.name}`);
    writeFileSync(file, `${JSON.stringify(catalogue, null, 1)}\n`);
  } catch (e) {
    console.error(`${d.code}: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}

for (const c of pending) {
  try {
    await unsplash(c.download);
    reported.add(c.id);
    writeFileSync(cacheFile, JSON.stringify({ ...cache, _reported: [...reported] }, null, 1));
  } catch (e) {
    console.error(`${pending.length - pending.filter((p) => reported.has(p.id)).length} use reports still pending: ${(e as Error).message}`);
    process.exitCode = 1;
    break;
  }
}
console.log(listOnly ? `Candidates saved for ${Object.keys(cache).filter((k) => k !== "_reported").length} destinations.` : process.exitCode ? "Not finished: run again later." : "Done.");
