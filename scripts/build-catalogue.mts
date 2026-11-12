// One-off: fills in destination photos in src/lib/catalogue.json from Unsplash.
// Run locally:  UNSPLASH_ACCESS_KEY=... node scripts/build-catalogue.mts
// Needs a free Unsplash developer key (50 requests/hour in demo mode, so it paces itself and can be re-run to continue).
import { readFileSync, writeFileSync } from "node:fs";

const key = process.env.UNSPLASH_ACCESS_KEY;
if (!key) throw new Error("Set UNSPLASH_ACCESS_KEY");
const file = new URL("../src/lib/catalogue.json", import.meta.url);
const catalogue = JSON.parse(readFileSync(file, "utf8"));

let done = 0;
for (const d of catalogue) {
  if (d.photo) continue;
  if (done >= 45) {
    console.log("Stopping at 45 requests to stay under the hourly limit; run again in an hour for the rest.");
    break;
  }
  const q = new URLSearchParams({ query: `${d.city} ${d.country}`, orientation: "landscape", per_page: "1", content_filter: "high" });
  const res = await fetch(`https://api.unsplash.com/search/photos?${q}`, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" } });
  done++;
  if (!res.ok) {
    console.error(`${d.code}: HTTP ${res.status}`);
    if (res.status === 403 || res.status === 429) break;
    continue;
  }
  const hit = (await res.json()).results?.[0];
  if (!hit?.urls?.raw || !hit.user?.name) {
    console.error(`${d.code}: no photo found`);
    continue;
  }
  // Unsplash requires hotlinking its CDN URL and crediting the photographer with a link back.
  d.photo = hit.urls.raw;
  d.photoCredit = { name: hit.user.name, url: `${hit.user.links.html}?utm_source=dattrip&utm_medium=referral` };
  console.log(`${d.code}: ${hit.user.name}`);
  writeFileSync(file, `${JSON.stringify(catalogue, null, 1)}\n`);
}
