# Bin-It (working title: Trash Overflow Planner)

Hackathon project. Residents photo-report overflowing trash bins from a phone; city staff get a web dashboard that ranks where new bins would help most. Home city is Orlando, FL; NYC and Chicago prove it ports by config.

Main design doc (source of truth for intent): https://claude.ai/code/artifact/7fdca1aa-285e-4713-b72d-5fc4db5563be (tabs: Spec, Backend Setup, Mobile App, Web Dashboard). If this file and the doc disagree, ask the user.

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
- Mobile: Expo (React Native) + TypeScript + Expo Router, `apps/mobile`. expo-image-picker, expo-location, expo-image-manipulator, expo-secure-store, expo-crypto, react-native-maps, TanStack Query. Run in Expo Go.
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
db/              migrations/001_init.sql, seed.py, load_gold.py
data/            cities/*.yaml, notebooks/, test_photos/ (+labels.csv), raw/, gold/, fetch_city.py, eval.py, explain.py
scripts/         smoke.sh
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

`DATABASE_URL` (pooled Neon string), `NEON_API_KEY`, `NEON_PROJECT_ID`, `HF_TOKEN`, `CLASSIFIER_URL`, `CLASSIFIER_KEY`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `PHOTO_BASE_URL` (public base of the bucket; set after one test upload), `STAFF_KEY`, `USE_MOCKS`. Mobile: `EXPO_PUBLIC_API_BASE`. Web: `NEXT_PUBLIC_MAP_STYLE_URL`, optional `NEXT_PUBLIC_USE_CACHE`.
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
python db/load_gold.py orlando
python data/eval.py
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

## Status

Update this section as work lands.

- [ ] Neon project, schema, bucket
- [ ] Mock API deployed
- [ ] Classifier container + tunnel
- [ ] Seed data
- [ ] Real API handlers
- [ ] Databricks pipeline + gold load
- [ ] Mobile: report flow, nearby map, detail
- [ ] Web: queue, map/heatmap, bins tab, scenario tab
- [ ] Smoke tests, cache mode, recorded demo