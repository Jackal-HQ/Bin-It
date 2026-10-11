# Bin-It (working title: Trash Overflow Planner)

Hackathon project. Residents photo-report overflowing trash bins from a phone; city staff get a web dashboard that ranks where new bins would help most. Home city is Orlando, FL; NYC and Chicago prove it ports by config.

Main design doc (source of truth for intent): https://claude.ai/code/artifact/7fdca1aa-285e-4713-b72d-5fc4db5563be (tabs: Spec, Backend Setup, Mobile App, Web Dashboard). If this file and the doc disagree, ask the user.

Design: Daylight is the design for the whole project (warm paper ground, frosted rounded cards, pill controls, charcoal for the one action, sun yellow for selection, dot-matrix numerals). Every web page and every mobile screen follows `.claude/DESIGN.md`: read its "Daylight guide" section first (the "Mobile app (Expo)" part for `apps/mobile`). Reference implementations: `apps/web/components/Dashboard.tsx` and `apps/web/components/dash/` for the app (shared recipes in `dash/ui.tsx`), `apps/web/app/page.tsx` with `components/site/` for marketing and prose pages; tokens in `app/globals.css`. Use the tokens, never hardcoded hex (mobile: `apps/mobile/lib/theme.ts` and `components/ui.tsx`), and keep the map's data colors as in `lib/labels.ts`. There is no dark theme, on web or mobile.

## Hackathon tracks (why things are built this way)

- Headline: OneEthos "Innovation for Good" (local environmental problem, measurable impact).
- Secondary: Hugging Face (open-source models, meaningful ecosystem use), Databricks (data -> model -> useful result), Neon (backend meaningfully powered by Neon).
- Each sponsor tool must do a distinct, real job. Databricks crunches in batch, Hugging Face interprets, Neon serves, the map is the product.

## Architecture

```
Mobile (Expo) --\
                 >--> API (Next.js route handlers on Vercel) --> Neon Postgres (PostGIS, pgvector, branches)
Web (Next.js) --/        |--> Photo classifier (Docker on a teammate's laptop, via tunnel)
                         |--> HF Inference Providers (small LLM, recommendation reasons)
                         '--> Neon Object Storage (photos)
Databricks (batch) --> CSV export --> db/load_gold.py --> Neon
```

- Clients only talk to the API. They never touch the database, storage, classifier or Databricks.
- Databricks never calls the apps. Its outputs (cell scores, bin candidates, OSM bins) reach Neon via exported CSV and `db/load_gold.py`.

## Stack

- Web dashboard + API: Next.js (App Router) + TypeScript, `apps/web`. Map: MapLibre via react-map-gl; heatmap: deck.gl `H3HexagonLayer` + h3-js; data fetching: TanStack Query; validation: zod.
- Mobile: Expo SDK 57 (React Native) + TypeScript + Expo Router, `apps/mobile`. expo-image-picker, expo-location, expo-image-manipulator, expo-secure-store, expo-crypto, expo-file-system, react-native-webview, TanStack Query; Daylight skin: expo-font, expo-linear-gradient, `@expo-google-fonts/manrope` and `geist-mono` plus a static Doto font in `assets/fonts` (no UI kit: `react-native-paper` was removed). Light only. Run in Expo Go. Nearby map = MapLibre GL JS + OpenFreeMap tiles inside a WebView (`lib/mapHtml.ts`): no API key, no Google Cloud account; Street View is a plain Google Maps URL. The native `react-native-maps` view rendered black in Expo Go and is not used.
- DB: Neon Postgres with PostGIS + pgvector. Driver in API: `@neondatabase/serverless`.
- Photos: Neon Object Storage (S3-compatible, beta), bucket `report-photos`, `public_read`. Use `@aws-sdk/client-s3` with `forcePathStyle: true`. Fallback if the beta misbehaves: Vercel Blob.
- Classifier: FastAPI + zero-shot CLIP (`openai/clip-vit-base-patch32`, 512-dim embeddings) in Docker, `classifier/`. NOT a Hugging Face Space (Spaces that run code need a paid HF plan).
- LLM reasons: `huggingface_hub.InferenceClient` with a small instruct model from Inference Providers; prompt passes only numbers so it cannot invent facts.
- Data: Databricks (Free Edition or event workspace), notebooks in `data/notebooks/`, H3 resolution 9 cells, MLflow.
- Everything in TypeScript except `classifier/`, `db/*.py`, `data/*.py` (Python).

## Repo layout and ownership

```
apps/web/        Next.js: dashboard pages/components + app/api route handlers
apps/mobile/     Expo app
classifier/      FastAPI + CLIP container (Dockerfile, app.py, requirements.txt)
db/              migrations/001_init.sql, seed.py, load_gold.py, reset_demo.sql
data/            cities/*.yaml, notebooks/ (planned), test_photos/ (+labels.csv), raw/, gold/<slug>/*.csv, fetch_city.py, fetch_hf_test_photos.py, eval.py, explain.py
scripts/         test_upload.py, smoke.sh (planned)
docs/api.md      the API contract (copy of the Spec tab's contract)
mocks/           sample JSON, one file per endpoint
```

| Folder | Owner |
| --- | --- |
| apps/web pages + components | Web developer |
| apps/web/app/api, db, classifier | API + Neon developer |
| apps/mobile | Mobile developer |
| data | Databricks / data developer |

Stay inside the folder you were asked to work in. Do not scaffold a second Next.js project.

## API contract (summary; `docs/api.md` + `mocks/` are authoritative)

| Endpoint | Used by | Purpose |
| --- | --- | --- |
| GET /api/cities | both | cities with center, bbox |
| POST /api/reports | mobile | multipart photo report -> classified, maybe merged ticket |
| GET /api/reports/nearby | mobile | tickets + bins around a point, or inside `bbox` |
| GET /api/reports/{id} | mobile | one report |
| GET /api/tickets | web | queue; filter city/status/label; sorted by severity, count |
| PATCH /api/tickets/{id} | web | change status (staff key) |
| GET /api/cells | web | per-cell scores keyed by H3 id (accepts `bbox`) |
| GET /api/recommendations | web | ranked new-bin sites with `rationale` |
| POST /api/scenarios, DELETE /api/scenarios/{id} | web | what-if on a Neon branch; always delete the branch |
| GET /api/health | both | database + classifier status |

Conventions:
- JSON everywhere. Errors: `{"error": {"code": "...", "message": "..."}}`.
- Every call takes `city=<slug>` (orlando, nyc, chicago); POST bodies carry it as a field.
- Mobile sends anonymous `X-Device-Id` (random UUID kept on the phone). Staff endpoints need `X-Staff-Key` (env `STAFF_KEY`). Demo-grade protection only. No accounts, ever.
- Labels: `overflowing_can`, `bag_pile`, `illegal_dumping`, `clean`, `not_trash`, plus `unclassified` when the classifier is unreachable. Apps must render unknown labels as "received". Severity: int 0-3. Status: `received`, `reviewed`, `resolved`.
- Coordinates `lat`/`lng` WGS84; distances in metres. Photos: JPEG, longest side <= 1600 px, field `photo`.
- Every report/ticket object carries `is_synthetic` (bool). A ticket is synthetic when all its reports are (`bool_and`). UIs show a "demo data" label when true.
- `USE_MOCKS=1` makes route handlers return files from `mocks/`. Flip to 0 only after the Databricks tables are loaded.
- If you change a response shape: update `docs/api.md`, `mocks/`, and both clients' `lib/types.ts` in the same change.

## Data model (authoritative: `db/migrations/001_init.sql`)

Tables: `cities`, `tickets`, `reports` (geography point, `embedding vector(512)`, `is_synthetic`), `bins` (`source`: osm | city | proposed), `cell_scores` (H3 cell + centroid, `expected_overflow`, `reports_per_1k`, `under_reported`, `demand`), `bin_candidates` (rank, gain, nearest_bin_m, nearby_reports, rationale).

Report flow (`POST /api/reports`): validate -> upload photo to bucket -> POST photo to `CLASSIFIER_URL/classify` with `X-Classifier-Key` -> run duplicate query (within 50 m, last 7 days, cosine similarity cutoff ~0.85, tune on our photos) -> attach to ticket and raise `report_count`, or create a ticket -> respond per contract. If the classifier does not answer in ~10 s, save with label `unclassified`, severity 1.

Scenario flow: create a Neon branch of main via the Neon API, insert proposed bins (`source='proposed'`), run the coverage query on the branch, return before/after, delete the branch. Free plan allows 10 branches per project including main.

## Modeling (Databricks)

- Reporting bias is the key insight: raw 311 counts measure who reports, not where trash is. Predict expected overflow per cell from objective proxies (OSM places, transit stops, parks, population, income, bins nearby), compare to reports per 1,000 residents, flag high-expected / low-reported cells as `under_reported` (top/bottom quartile cutoffs are tunable assumptions).
- Orlando has no confirmed 311 sanitation dataset: train on NYC + Chicago using features every city has, apply to Orlando, say plainly the transfer is lightly validated. Validate across cities (train NYC / test Chicago and reverse).
- Bin recommendation: gain(s) = sum over cells of demand(c) * max(0, d_now(c) - d_s(c)); pick greedily, 50 per city. Coverage metric shown to staff: demand-weighted average distance to nearest bin, and % of demand within 150 m (150 m is an assumption; show it).
- Present all projected changes as estimates, never measured outcomes.

## City adapter

One YAML per city in `data/cities/`: slug, name, center, bbox (four numbers: west, south, east, north), census FIPS codes, osm bins tag, complaints source (socrata | none), bins source. Adding a city = config + data load, no code changes. Dataset facts checked 2026-10-10: NYC 311 "Service Requests from 2020 to Present" (id erm2-nwe9; fields `complaint_type`, `created_date`, `latitude`, `longitude`) and DSNY Litter Basket Inventory (id 8znf-7b2c) exist. Chicago: use "311 Service Requests" (id v6vf-nfxy, updated daily; fields `sr_type`, `created_date`, `latitude`, `longitude`). The older Chicago "Sanitation Code Complaints" dataset (me59-5fac) is historical-only (data stops ~2019): do not use it. Verified Chicago `sr_type` values include "Sanitation Code Violation", "Fly Dumping Complaint", "Street Cleaning Request", "Wire Basket Request" (meaning of the last unverified). NYC complaint-type strings are NOT yet verified: list them with a SoQL group-by before filling `category_map`. Neither city has a confirmed overflow-only type, so the model target is litter-related complaint density; say that, not "bin overflow". The three city files are in the Backend Setup tab, Step 4.

## Test photos

No ready-made dataset fits our classes. The team shoots 60-100 photos. `data/test_photos_raw/` holds the originals (they contain GPS data: gitignored, never published, shared via a team drive). `data/prep_photos.py` (rotate, resize to 1600 px, strip EXIF) writes processed `.jpg` copies into `data/test_photos/`, which is what all code reads; never edit those by hand, rerun the script. `data/test_photos/labels.csv` (filename,label,severity,staged) is hand-written, uses the processed `.jpg` names and the 0-3 severity rubric from the doc, and is never overwritten by the script. Staged photos must be marked and disclosed. No faces or license plates. Keep one photo named `overflow1.jpg` (the smoke test uses it). The same photos feed `data/eval.py` (accuracy for the slide), `db/seed.py` (demo reports, flagged synthetic) and the public Hugging Face dataset (EXIF stripped first).

## Environment variables (`.env.local`, never commit)

`DATABASE_URL` (pooled Neon string), `NEON_API_KEY`, `NEON_PROJECT_ID`, `HF_TOKEN`, `CLASSIFIER_URL`, `CLASSIFIER_KEY`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `AWS_REGION`, `PHOTO_BASE_URL` (public base of the bucket; set after one test upload), `STAFF_KEY`, `USE_MOCKS`. Optional `HF_MODEL` for `data/explain.py`. Python scripts read the repo-root `.env.local`; the Next.js app reads `apps/web/.env.local`: keep them in sync. Mobile: `EXPO_PUBLIC_API_BASE`. Web: `NEXT_PUBLIC_MAP_STYLE_URL`, optional `NEXT_PUBLIC_USE_CACHE`.
Never put `NEON_API_KEY` (or any secret) in web or mobile client code. Only API routes use it.

## Commands (developers are on Windows / PowerShell)

```powershell
# env var syntax in PowerShell
psql $env:DATABASE_URL -f db/migrations/001_init.sql

# web + api
cd apps/web; npm run dev
# mobile (add --tunnel if wifi blocks device-to-laptop traffic)
cd apps/mobile; npx expo start

# classifier container
docker build -t trash-classifier classifier/
docker run -d --name classifier -p 7860:7860 -e CLASSIFIER_KEY=<secret> --restart unless-stopped trash-classifier
cloudflared tunnel --url http://localhost:7860     # or: ngrok http 7860

# data + db scripts (python)
python data/fetch_city.py orlando
python db/seed.py
python db/load_gold.py orlando                      # then nyc, chicago (replaces that city's gold rows, clears rationale)
python data/explain.py orlando                      # bin-site rationales (LLM top 20, template for the rest); or: all
python data/eval.py
# demo reset: run db/reset_demo.sql in the Neon SQL Editor
bash scripts/smoke.sh                               # needs curl, jq, psql (use Git Bash/WSL)
```

In PowerShell, `curl` is an alias for `Invoke-WebRequest`; use `curl.exe` for the curl examples in the docs.

## Gotchas learned (do not rediscover)

- School wifi blocks outbound TCP 5432 (verified: 443 works, 5432 refused). `psql`, `seed.py`, `load_gold.py` fail there. Run the migration in the Neon Console SQL Editor, and run those scripts from a phone hotspot or another network. Vercel-hosted API is unaffected. The classifier tunnel (Cloudflare may use a non-443 port) must be tested on venue wifi; try ngrok if it fails.
- Neon Free: database storage 0.5 GB per project (aggregates only, never raw 311 rows or photos), 100 CU-hours/month, 10 branches, compute scales to zero (first query after idle is slow; warm up before demos). Object Storage is a separate allowance (5 GB on Free per Neon docs); verify DB size does not move after a test upload. Downloads count toward network transfer.
- Neon PostgreSQL version 18 was offered; if `CREATE EXTENSION postgis`/`vector` errors, recreate the project on 17.
- Databricks Free Edition: serverless only, restricted outbound internet (LinkedIn verification adds access). Default path: fetch data locally, upload to a volume, export gold tables as CSV, load with `db/load_gold.py`.
- Hugging Face free monthly Inference Providers credit is tiny; rely on the event's $20/hacker credit and write LLM rationales only for the top 20 sites per city, cached in `bin_candidates.rationale`, with a template fallback.
- Classifier host laptop must be plugged in, sleep disabled, tunnel left running (a quick tunnel's URL changes on restart: update `CLASSIFIER_URL` on Vercel and redeploy). Keep a second laptop with the same container as standby.
- Expo Go supports one SDK at a time; the store version defines it (project is SDK 57). Run Expo from `apps/mobile`, never the repo root (`npx` there downloads a random Expo version). Use `npx expo start -c` after changing `EXPO_PUBLIC_*` vars.
- SDK 57's global `fetch` is Expo's and rejects React Native `{ uri, name, type }` FormData parts ("Unsupported FormDataPart"). Send photos with `expo-file-system`'s `File` (see `createReport` in `apps/mobile/lib/api.ts`).
- CARTO basemap tiles now need a free API key (keyless tiles are watermarked "API KEY REQUIRED"); we use OpenFreeMap with an OSM fallback instead. OpenFreeMap and OSM tiles are free public services, fine for a demo only.
- `data/cities/*.yaml` bboxes are rough: UCF is outside Orlando's. Do not use a bbox to decide whether a phone is "in" a city; the mobile app uses distance from the city center.
- Reports are saved at the device GPS, not at the selected city's location. A report made with the wrong city selected is stored under that city at the real coordinates.
- `db/reset_demo.sql` only removes device ids `test` and `demo`; phone reports use a random UUID, so add it to the list when cleaning up.
- `db/load_gold.py` stores a blank `reports_per_1k` as NULL (the column is nullable). The current exports have it blank for every cell, so no cell is flagged `under_reported` yet; the pipeline must join population/311 data before the under-reported layer means anything. Check `demand` is not all zeros too.
- Hugging Face Inference Providers only serve models listed at `https://router.huggingface.co/v1/models` (query it with the token). `meta-llama/Llama-3.2-3B-Instruct` is NOT served for our token (`model_not_supported`); `data/explain.py` defaults to `meta-llama/Llama-3.1-8B-Instruct`, which answered. Avoid reasoning models (empty content at small `max_tokens`). Template sentences cached in `bin_candidates.rationale` are upgraded to LLM text on a later run automatically; LLM text is kept unless `--force`.
- Run Python scripts from the repo root with the venv active (system Python lacks psycopg). Use Python 3.12.
- The classifier's label is stored even when wrong (about 84% label accuracy on 119 photos at the last eval); `unclassified` reports never merge.
- Existing prior art: the City of Orlando already runs a "Clean & Safe" app for reporting overflowing cans downtown. Our differentiators: duplicate merging, photo severity, reporting-bias correction, bin placement planning.

## Working rules for Claude

- Hackathon time budget: choose the simplest thing that works. No Redux, no microservices, no extra backend language, no login/accounts.
- Do not invent facts about datasets, ids, limits or API formats. If something is unverified, say so and give a way to check. Items still unverified: Neon public object URL format, exact tunnel commands, Vercel function timeout on our plan (`POST /api/reports` waits on the classifier), CLIP availability via HF Inference Providers (not needed now).
- Seeded or demo data must be flagged `is_synthetic` and labeled in the UI. Never present synthetic data as real.
- Privacy: no accounts or names; strip EXIF except coordinates; photos may show passers-by and sit at public URLs, so never upload test photos with identifiable faces. Say so in the in-app privacy note.
- Keep new files in the folder that owns them. Prefer editing the contract + mocks first, then code.
- When asked to run scripts that connect to Neon directly, remind the user if they are on school wifi.
- Match the existing code style; do not add dependencies without saying why.

## Build order and gates

1. Neon (project, API key, schema, bucket) -> 2. mock API deployed -> 3. classifier container + tunnel + labeled test photos. **Gate 1:** contract committed, mock API URL shared, data path works.
4. Seed demo data -> 5. real API handlers. **Gate 2:** a phone report appears on the dashboard.
6. Databricks (fetch, silver, model, gold, load, reasons). **Gate 3:** ranked bins + scenario run for Orlando and one more city.
7. Smoke tests, cached-data mode, rehearsal. **Gate 4:** code freeze, demo rehearsed twice.

Demo (about 3 minutes): report an overflowing bin on the phone (classified, merged with a nearby duplicate) -> report appears on the dashboard -> ranked bin recommendations with the under-reported layer -> run add-top-20-bins scenario on a Neon branch -> switch city to NYC and Chicago with no code changes. Keep cached responses and a screen recording as fallback.

## Web dashboard (apps/web/app/dashboard)

Build spec and decisions: `docs/web-dashboard.md` (supersedes the plan below where they differ: map left + side panel with Queue / Bins / Scenario tabs at `/dashboard`, OpenFreeMap tiles, staff key on PATCH only). Built on 2026-10-10 against mocks; Phases 1-3 of the spec are in place, Phase 4 polish and the live-data checks remain.

Visual style: Daylight (`.claude/DESIGN.md`), ported 2026-10-11. Fonts are Manrope and Doto (axes wght + ROND, round dots) from `next/font/google` in `app/layout.tsx`, so a build needs network for Google Fonts; Geist Mono was already loaded. The map layers and colors (`components/map/layers.ts`, `lib/labels.ts`) were not touched; only its legend, zoom and attribution are restyled.

Gotchas: `@loaders.gl/*` is pinned to 4.5.3 via `overrides` (4.5.4 is partly published); hexes use `PolygonLayer` + `h3-js`, not `@deck.gl/geo-layers`. MapLibre 6's worker is copied to `public/` on `postinstall` (`scripts/copy-maplibre-worker.mjs`) and set with `setWorkerUrl`; without it the map shows no tiles and no pins. Local `next build` needs `DATABASE_URL` or `USE_MOCKS=1`.

### Original plan (kept for the API work list)

State today: `apps/web/app/page.tsx` is a placeholder wordmark page. The API route handlers exist (tickets, cities, health, reports live; cells, recommendations, scenarios mock-only). `package.json` has only next, react, zod, the Neon driver, the S3 client and Tailwind v4. Nothing for maps, data fetching or H3 is installed yet. Read `node_modules/next/dist/docs/` before routing or caching work (Next 16, `cacheComponents`, async `params`).

Goal: staff open one page, pick a city, see the ticket queue, a map with the under-reported heat layer and recommended bins, and run an add-bins what-if. Owner: web developer; the three mock-only endpoints belong to the API developer. Contract first: mocks and `docs/api.md` already define every shape the dashboard needs, so the UI can be built against `USE_MOCKS=1` and switched to real data with no UI change.

### Layout

One page, `app/page.tsx`, with a city selector (orlando / nyc / chicago, from `GET /api/cities`), a staff-key field and a health dot in the header, and three tabs sharing one map:

| Tab | Data | What staff do |
| --- | --- | --- |
| Queue | `GET /api/tickets?city&status&label` | Sorted by severity then report count; filter by status/label; open a ticket (photo, label, severity, report count, first/last seen); set status received / reviewed / resolved via `PATCH`. Clicking a row flies the map to the ticket. |
| Map | `GET /api/cells`, `GET /api/tickets`, bins from `GET /api/reports/nearby?bbox=` | Toggle layers: H3 expected overflow, under-reported cells, tickets (severity-colored, "Demo data" badge when `is_synthetic`), existing bins. |
| Bins | `GET /api/recommendations` | Ranked list of 50 sites with gain, nearest bin distance, nearby reports and the `rationale`. Select sites (default top 20), show them on the map, run the scenario. |

Scenario panel (inside the Bins tab): "Add top N bins" calls `POST /api/scenarios`, shows before/after average distance to nearest bin and % of demand within 150 m (label them "estimated" and show the 150 m assumption), then ALWAYS calls `DELETE /api/scenarios/{id}` (also on error and unmount). Disable the button while a scenario runs; the free plan allows 10 branches including main.

### Files (create under apps/web)

```text
app/page.tsx                    shell: header (city, staff key, health dot), tabs, shared map
components/Providers.tsx        TanStack Query provider + selected-city context
components/MapView.tsx          react-map-gl (MapLibre) + deck.gl overlay; client component, no SSR
components/layers.ts            H3HexagonLayer (cells), ScatterplotLayer (tickets, bins, recommended)
components/TicketQueue.tsx      table + filters + status actions
components/TicketDrawer.tsx     one ticket detail + status change
components/RecommendationList.tsx
components/ScenarioPanel.tsx    run / before-after / cleanup
components/Legend.tsx           color scales + "estimates" note
lib/api.ts                      typed fetchers (same origin); adds X-Staff-Key to PATCH
lib/hooks.ts                    useCities, useTickets, useCells, useRecommendations, useScenario
lib/types.ts                    exists; keep in sync with docs/api.md and apps/mobile/lib/types.ts
```

### Dependencies to add (and why)

`@tanstack/react-query` (caching, refetch after PATCH); `maplibre-gl` + `react-map-gl` (basemap with the same keyless OpenFreeMap style the mobile app uses: set `NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty`); `deck.gl` (or `@deck.gl/core`, `layers`, `geo-layers`, `mapbox`) for `H3HexagonLayer`; `h3-js` (peer of the H3 layer). No charting or UI kits. State the reason in the commit message.

### Behavior rules

- All fetching goes through `lib/api.ts`. The browser never calls Neon, storage, the classifier or Databricks, and no secret is read client-side. Staff type the staff key into the header; keep it in `sessionStorage` only (demo-grade) and send it only on PATCH. Never put `STAFF_KEY` in a `NEXT_PUBLIC_*` var.
- Switching city re-centers the map on that city's center from `/api/cities` (never test "inside the bbox": the YAML bboxes are rough) and refetches every query by `city`.
- Render unknown labels as "received" and `unclassified` as "not classified"; severity 0 is "clean".
- Every synthetic ticket shows a "Demo data" badge. The footer states that projected changes are estimates, that the Orlando model is lightly validated, and that the target is litter-related complaint density, not measured bin overflow.
- Empty states matter for the demo: no gold data for a city -> "scores not loaded for this city", not an empty map. `under_reported` is false everywhere until the pipeline fills `reports_per_1k`; do not present that layer as meaningful until it does.
- Cell payloads are about 3.7k (Orlando), 5.6k (Chicago), 7.4k (NYC) rows, a few hundred KB: fine to load per city; pass `bbox` if it gets slow.
- Cached mode: `NEXT_PUBLIC_USE_CACHE=1` reads pre-saved JSON from `apps/web/public/cache/<endpoint>-<city>.json` so the demo survives dead wifi. Add a small script that saves the live responses once Gate 3 data is loaded.

### API work the dashboard needs (API developer)

DONE: all of items 1-3 are live (`GET /api/recommendations`, `GET /api/cells`, scenarios); `reports_per_1k` is nullable. Scenario ids are `s_<neon branch id>`; only branches named `scenario-*` are ever deleted; stale ones (>15 min) are swept on the next create.

1. `GET /api/recommendations?city=`: select rank, lat/lng from `geom`, gain, nearest_bin_m, nearby_reports, rationale from `bin_candidates` joined to `cities`, ordered by rank. Easiest; unblocks the Bins tab. Run `python data/explain.py <slug>` first so `rationale` is filled.
2. `GET /api/cells?city=&bbox=`: from `cell_scores` (centroid as lat/lng), optional `ST_MakeEnvelope` filter, same shape as `mocks/cells.json`.
3. `POST /api/scenarios` + `DELETE /api/scenarios/{id}`: create a Neon branch of main via the Neon API (`NEON_API_KEY`, `NEON_PROJECT_ID`, server only), connect to the branch, insert `proposed` bins, compute before/after coverage from `bins` + `cell_scores.demand`, return the contract shape, delete the branch in `DELETE` and as a safety net on failure. Unverified: the exact Neon API calls for branch creation and the branch connection string; check the Neon API reference before coding. Fallback if branches misbehave: compute before/after in a transaction that rolls back, and say so.
4. Keep `if (mocksEnabled()) return mocks...` first in each handler; update `docs/api.md` and `mocks/` if any shape changes.

### Build order

1. Providers, `lib/api.ts`, `lib/hooks.ts`, city selector, health dot (against mocks).
2. Queue tab with real tickets and PATCH (Gate 2: a phone report shows up here).
3. Map with tickets and bins; then the H3 cell layer and under-reported toggle.
4. Bins tab on `GET /api/recommendations`.
5. Scenario panel and cleanup guarantees.
6. Polish: empty/loading/error states, legend, demo-data badges, cached mode, narrow-width check, two 3-minute click-through rehearsals.

Done when the demo script below runs on the deployed Vercel URL for all three cities without code changes, with cached mode as the fallback.

## Status

Update this section as work lands.

- [x] Neon project, schema, bucket
- [x] Mock API deployed
- [x] Classifier container + tunnel (84% label / 59% exact severity on 119 photos at last eval; prompts retuned afterwards, re-measure after rebuild; prompts in `classifier/app.py`)
- [x] Seed data (Orlando, NYC, Chicago; `db/seed.py`, reset with `db/reset_demo.sql`)
- [ ] Real API handlers: cities, health, reports, reports/nearby, reports/{id}, tickets, tickets/{id}, cells, recommendations, scenarios are all live (scenarios: Neon branch via `lib/scenarios.ts`, falls back to a no-write "calculated" mode; ~5 s on a real branch, numbers identical in both modes)
- [ ] Databricks pipeline + gold load: `db/load_gold.py` written (expects `data/gold/<slug>/{cell_scores,bins,bin_candidates}.csv`); notebooks and CSV export not in the repo yet; gold CSVs for orlando/nyc/chicago exist under `data/gold/` (`reports_per_1k` blank, so no under-reported flags yet); `data/explain.py` runs (LLM top 20 with `meta-llama/Llama-3.1-8B-Instruct`, templates for the rest); whether gold and rationales are loaded in Neon for all three cities is not confirmed
- [x] Mobile: report flow, nearby map, detail; Daylight skin (light only, `lib/theme.ts` + `components/ui.tsx`)
- [ ] Web: `/dashboard` restyled to Daylight (2026-10-11) and built against mocks (queue with polling + status PATCH, map with pins/bins/heatmap/under-reported/sites, bins tab, scenario tab with branch cleanup, cached-data mode + `scripts/save-cache.ts`); still to do: test against live data (Gate 2), real cells/recommendations/scenarios handlers, cache saved for all three cities, rehearsal
- [ ] Smoke tests, cache mode, recorded demo