# dattrip

Finds the cheapest complete trip: return flights plus a well-rated, central hotel, added up.

## Setup

```sh
pnpm install
cp .env.example .env.local   # fill in the keys below
pnpm dev
```

| Variable | What it enables | Where to get it |
|---|---|---|
| `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER` | Flight prices and booking links | travelpayouts.com → join the Aviasales program |
| `LITEAPI_KEY` | Hotel prices | connect.nuitee.com (a sandbox key works to start) |
| `LITEAPI_WHITELABEL_DOMAIN` | "Book the hotel" links | your LiteAPI whitelabel site's hostname |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Natural-language search and the trip assistant (optional) | aistudio.google.com |

A missing key shows a setup notice for that part; nothing is ever filled with sample data.

Destination photos come from Unsplash. With `UNSPLASH_ACCESS_KEY` in `.env.local`, `node --env-file=.env.local scripts/build-catalogue.mts --candidates` fetches options and the same command without the flag writes the picks (`LIS=2` chooses another option) into `src/lib/catalogue.json`. Credits are shown at `/credits`.

## How a search works

1. `POST /api/search` asks the flight provider for real date pairs (one request per origin and month, not per day), filters them to the requested window, and returns the cheapest destinations.
2. The page calls `POST /api/trips` per destination. It prices hotels for that destination's three cheapest date pairs and combines every flight with the top hotels, so the cheapest *total* wins, not the cheapest outbound.
3. `/trip/[id]` rebuilds a trip from its id with current data. Booking buttons go through `/api/go`, which re-checks the price before redirecting.

## What to know about the data

- Flight prices are fares other travellers found recently (Aviasales cache), priced for one adult. Totals for more travellers are that fare × travellers and labelled as estimates. The booking site is the final check.
- The flight source has no arrival times, layover airports or baggage rules, so dattrip doesn't show them.
- Hotels must be rated 8.0+ and within 3 km of the centre. Breakfast-inclusive rates rank first and are priced at the breakfast rate.

## Adding a provider

Implement `FlightProvider` (`src/lib/flights/providers/types.ts`) or `HotelProvider` (`src/lib/hotels/providers/types.ts`) and switch the export in the matching `search-engine.ts`.

## Checks

`pnpm typecheck && pnpm lint && pnpm test`
