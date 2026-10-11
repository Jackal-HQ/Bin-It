# Web dashboard build spec

The design doc's Web Dashboard tab, broken down page by page and checked against `docs/api.md`, `mocks/` and the code in `apps/web`. Where the tab and `.claude/CLAUDE.md` disagreed, the team's decision (2026-10-10) is recorded below. The contract (`docs/api.md`) still wins for response shapes.

Visual style: Daylight, defined in `.claude/DESIGN.md` (this spec covers behavior and data; the look lives there). Components in `apps/web/components/panel/` use the shared recipes in `apps/web/components/dash/`.

Staff open `/dashboard` and get answers to three questions: what residents are reporting now, where the model says bins are missing, and what a plan would change.

## Decisions

| Topic | Decision | Why |
| --- | --- | --- |
| Route | `apps/web/app/dashboard/` (URL `/dashboard`) | The landing page at `/` already links there. A `(dashboard)` route group would clash with `app/page.tsx`. |
| Layout | Map on the left, one side panel with tabs **Queue / Bins / Scenario** | Follows the design doc. This replaces the Queue/Map/Bins layout in CLAUDE.md. |
| Basemap | OpenFreeMap `https://tiles.openfreemap.org/styles/liberty` via `NEXT_PUBLIC_MAP_STYLE_URL` | No key or account, same as mobile. It is not the OSM tile server the doc warns about. |
| Ticket photos | Add `photo_url` to `GET /api/tickets` (contract change, below) | The queue thumbnail and the detail card both need it. |
| Staff key | Sent only on `PATCH /api/tickets/{id}` | Matches the contract. Scenarios stay keyless. |
| Charts | No `recharts` | The scenario shows four numbers and a delta. Nothing needs a chart library. |
| Cells | Fetch once per city, without `bbox` | Orlando ~3.7k, Chicago ~5.6k, NYC ~7.4k rows (a few hundred KB). deck.gl draws only what is visible. The Bins tab also needs every cell for its badge. Switch to `bbox` if it gets slow. |
| Pins and bins | `GET /api/reports/nearby?bbox=` for the visible area, refetched when the map stops moving | Follows the doc. It leaves out resolved tickets and caps at 200 tickets + 200 bins. |
| Hex layer | `PolygonLayer` + `h3-js` `cellToBoundary`, not `H3HexagonLayer` | `@deck.gl/geo-layers` pulls `@loaders.gl/*@4.5.4`, a partly published release (`compression@4.5.4` does not exist). `package.json` pins `@loaders.gl/*` to 4.5.3 with `overrides`; remove them once 4.5.4 is complete. |
| Map worker | `postinstall` copies `maplibre-gl-worker.mjs` into `public/` (gitignored); `MapView` calls `setWorkerUrl` | MapLibre 6 finds its worker next to its own module, and the Turbopack bundle breaks that path ("Worker failed to load": no tiles, no pins). |

## Screen

```text
+--------------------------------------------------------------------------+
| Bin-It   [City: Orlando v]  cold-start model   [layers v]   key  * health |
+-----------------------------------------------+--------------------------+
|                                               | Queue | Bins | Scenario  |
|                                               |--------------------------|
|                 MapView                       |  active tab content      |
|  pins + hexes + under-reported + bins + sites |                          |
|                                               |--------------------------|
|  [legend]                                     |  DetailCard (selected)   |
+-----------------------------------------------+--------------------------+
| Estimates, not measured outcomes - Orlando model lightly validated - ... |
+--------------------------------------------------------------------------+
```

The URL holds the selected city, tab and item: `/dashboard?city=orlando&tab=queue&sel=t_03`. Any demo state can be linked or reloaded. On narrow screens the panel stacks under the map.

## Files

All new files go under `apps/web`. `app/api/**` belongs to the API developer and is not touched here, except for the `photo_url` change.

```text
app/dashboard/layout.tsx          Providers + page title
app/dashboard/page.tsx            Suspense boundary around the client Dashboard
components/Dashboard.tsx          URL state (?city ?tab ?sel), queries, map + side panel + footer
components/Providers.tsx          TanStack QueryClientProvider
components/TopBar.tsx             name, CitySwitcher, layer menu, staff key, health dot, mock/cached chips
components/CitySwitcher.tsx       /api/cities -> ?city=; cold-start note by slug
components/map/MapView.tsx        react-map-gl (MapLibre) + deck.gl MapboxOverlay; client only
components/map/layers.ts          PolygonLayer hexes x2, Scatterplot/Text layers for pins, bins, sites, selection
components/map/Legend.tsx         collapsible; one entry per visible layer + "estimates" note
components/panel/QueueTab.tsx     table, label/status filters, 5 s polling, new-row flash
components/panel/BinsTab.tsx      top 20 sites, score bar, badges, Top N control
components/panel/ScenarioTab.tsx  N slider, Run, before/after, Reset, guaranteed cleanup
components/panel/DetailCard.tsx   ticket / site / cell detail; status control for tickets
components/panel/TopNControl.tsx  shared Top N slider
components/panel/Thumb.tsx        photo with placeholder
components/panel/States.tsx       Loading / Empty / ErrorRetry + badges
lib/api.ts                        every fetch; error parsing; X-Staff-Key; cached mode
lib/hooks.ts                      useCities, useHealth, useTickets, useNearby, useCells, useRecommendations, useStaffKey
lib/labels.ts                     label/severity/status text + color-blind-safe colors
lib/selection.ts                  ?sel= format (t:<id>, s:<rank>, c:<h3>) and layer toggles
lib/types.ts                      contract types (+ Health, Bbox)
scripts/copy-maplibre-worker.mjs  postinstall: worker into public/
scripts/save-cache.ts             saves live JSON to public/cache/
```

Dependencies: `@tanstack/react-query`, `maplibre-gl` (6.x), `react-map-gl` (8.x), `@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/mapbox` (9.3.11) and `h3-js`.

## Views

### Top bar and city switcher (FR-11)

| Element | Data | Behavior |
| --- | --- | --- |
| City select | `GET /api/cities` | Writes `?city=`. Re-centers on `center` (never tests "inside bbox"; the bboxes are rough). Every query is keyed by `city`, so all panels reload. |
| Cold-start note | hard-coded: `orlando` | "Cold-start model: no local complaint data". Ask the API developer for a flag on `/api/cities` if this should be dynamic. |
| Layer toggles | local state | Pins, risk hexes, under-reported, bins, recommended sites. |
| Staff key | `sessionStorage` | Asked once per session, the first time a status change needs it. A wrong key (`401`) shows "Staff key not accepted" and clears the stored key. |
| Health dot | `GET /api/health` every 30 s | Green when database and classifier are `ok`. Tooltip shows each one and `use_mocks`. |

### Map (FR-7, FR-10)

| Layer | Source | Encoding |
| --- | --- | --- |
| Ticket pins | `nearby.tickets` (bbox) | Color and size by `max_severity`, report-count badge, hollow ring when `is_synthetic` plus "demo data" in the card |
| Overflow-risk hexes | `cells` | Sequential color-blind-safe scale on `expected_overflow` |
| Under-reported hexes | `cells` where `under_reported` | Outline/hatch on top of the risk hexes, so it shows without relying on color |
| Existing bins | `nearby.bins` (bbox) | Small dark squares (shape differs from pins) |
| Recommended sites | `recommendations` (top N) | Numbered circles by `rank`; highlighted while a scenario result is shown |

Clicking a pin, hex or site sets `?sel=` and opens the DetailCard. The pins/bins bbox comes from the map's bounds and is refetched on `moveend`. A city with no cells shows a "No model results loaded for this city" overlay instead of an empty map.

Today `under_reported` is false for every cell, because `reports_per_1k` is blank in the gold exports. The legend must say "no under-reported areas flagged yet" until the pipeline fills it.

### Queue tab (FR-6, FR-14)

| | |
| --- | --- |
| Data | `GET /api/tickets?city&status&label`, `refetchInterval: 5000` while the tab is visible |
| Columns | severity, label, report count, status, last seen, photo thumbnail |
| Sort | Server order: `max_severity` desc, then `report_count` desc |
| Filters | label, status (written to the query, not the URL) |
| Row click | Selects it, flies the map to it, opens the DetailCard |
| New rows | Ids not seen in the previous poll flash for ~2 s |
| Text | Unknown label -> "received", `unclassified` -> "not classified", severity 0 -> "clean"; "demo data" badge when `is_synthetic` |

### Bins tab (FR-8, NFR-8)

| | |
| --- | --- |
| Data | `GET /api/recommendations?city`, showing the top 20 |
| Row | rank, `rationale` sentence, score bar from `gain` (scaled to the max in the list), `nearest_bin_m` as "410 m to nearest bin", `nearby_reports` |
| Under-reported badge | `h3-js latLngToCell(lat, lng, 9)` looked up in the city's cells; badge when that cell is `under_reported` |
| Row click | Flies the map to the site and opens the DetailCard |
| Top N | 5 to 50 (default 20). Shared with the Scenario tab and the map's numbered sites |

The top recommendation is reached in two clicks: the Bins tab, then row 1.

### Scenario tab (FR-9)

| | |
| --- | --- |
| Input | N slider (same value as Top N) and a Run button |
| Call | `POST /api/scenarios {city, proposed_bins: top N lat/lng}` |
| Result | Before and after side by side: weighted average distance to a bin (m) and share of demand within 150 m (%), each with its change |
| Map | Proposed sites stay highlighted while the result is shown |
| Cleanup | `DELETE /api/scenarios/{id}` on Reset, on leaving the tab, on city change, on unmount and on `pagehide`; the button is disabled while a run or delete is in flight |
| States | running (spinner), error (`error.message` + Retry; a branch-limit error says "Too many scenario branches open, try again in a minute"), success |
| Assumptions printed under the numbers | "150 m coverage threshold is an assumption. Results are model estimates, not measured outcomes." |

### Detail card

| Item | Ticket | Recommended site |
| --- | --- | --- |
| Photo | large `photo_url` (none when `null`) | none |
| Fields | label, severity, report count, first/last seen, status | rank, rationale, gain, nearest bin, nearby reports, under-reported badge |
| Actions | status select -> `PATCH /api/tickets/{id}` with the key; on success invalidate tickets + nearby | none |
| Honesty | "demo data" when `is_synthetic` | "estimate" wording |

## Shared behavior

- **States.** Every panel has loading, empty and error states. An error shows the contract's `error.message` with Retry.
- **Fetching.** Everything goes through `lib/api.ts`. The browser never sees a secret, and `STAFF_KEY` is never in a `NEXT_PUBLIC_*` var.
- **Honesty (NFR-5).** Synthetic rows and pins are labeled. The footer states: projected changes are estimates; the Orlando model is lightly validated (trained on NYC + Chicago); the target is litter-related complaint density, not measured bin overflow; under-reported cutoffs are tunable quartile assumptions.
- **Cached mode (NFR-7).** With `NEXT_PUBLIC_USE_CACHE=1`, `lib/api.ts` reads `/cache/cities.json` and `/cache/<city>/{tickets,nearby,cells,recommendations}.json`, and disables PATCH and scenarios, with a note. Fill them after Gate 3 from `apps/web`: `node --experimental-strip-types scripts/save-cache.ts https://<app>.vercel.app`. Basemap tiles still need the network.
- **Mocks.** With `USE_MOCKS=1` every city returns the same Orlando JSON. City switching still re-centers the map, but the data does not change until real handlers are used. `mocks/cells.json` holds 91 real resolution-9 cells around downtown Orlando so the heatmap shows in mock mode.
- **Local production build.** `next build` prerenders GET handlers, so it needs `DATABASE_URL` or `USE_MOCKS=1`. On Vercel the database query stops prerendering, so live handlers run per request.

## Contract change: `photo_url` on `GET /api/tickets`

The rule is the same as on `/api/reports/nearby`: the photo of the ticket's most severe, then most recent, report, or `null`. It is made in one change:

1. `docs/api.md`: add `photo_url` to the tickets example and note.
2. `mocks/tickets.json`: add `photo_url` to each ticket.
3. `apps/web/app/api/tickets/route.ts`: reuse the nearby handler's photo subquery.
4. `apps/web/lib/types.ts` and `apps/mobile/lib/types.ts`: update the `photo_url` comment (the field is already optional).

## Build order

Phase 1, against mocks (Gate 1)
- [ ] Install deps; `Providers`, `lib/api.ts`, `lib/hooks.ts`, `lib/labels.ts`
- [ ] `/dashboard` shell; map renders OpenFreeMap centered on the selected city
- [ ] CitySwitcher re-centers and reloads; health dot
- [ ] Queue tab shows mock tickets

Phase 2, core loop (Gate 2: a phone report appears in the queue and on the map)
- [ ] `photo_url` contract change
- [ ] Queue polling, filters, new-row flash
- [ ] Pins + bins by bbox; DetailCard with photo, status and PATCH
- [ ] Risk hex layer + legend; empty overlay for cities without scores

Phase 3, smart layer (Gate 3: recommendations + a scenario for Orlando and one more city)
- [ ] Bins tab, numbered sites, Top N
- [ ] Under-reported layer, badge and legend
- [ ] Scenario tab with before/after, assumptions and guaranteed cleanup

Phase 4, polish (Gate 4)
- [ ] Loading/empty/error everywhere; title + favicon; low-resolution check
- [ ] `save-cache.ts` run for all three cities; cached mode tested offline
- [ ] Demo-data labels checked on every view; demo run twice on venue wifi

The API developer still owns the real `cells`, `recommendations` and `scenarios` handlers (see the work list in CLAUDE.md). The dashboard runs on mocks until those land.
