# KIRO.md — Bin-It working guide for the Kiro CLI agent

This file is Kiro's operating guide for the Bin-It repo. It is derived from
`.claude/CLAUDE.md`, `docs/api.md`, and `apps/web/AGENTS.md`. Those three files
remain authoritative; if this file disagrees with them, follow them and tell the
user. The main design doc (linked in `.claude/CLAUDE.md`) is the source of truth
for intent — if the code and the doc disagree, ask the user.

## What the project is

Bin-It (a.k.a. Trash Overflow Planner) is a hackathon project. Residents photo-report
overflowing trash bins from a phone; city staff get a web dashboard that ranks where
new bins would help most. Home city is Orlando, FL; NYC and Chicago prove it ports by
config. The reporting-bias correction (raw 311 counts measure who reports, not where
trash is) is the core insight. Present projected changes as estimates, never measured
outcomes.

Hackathon tracks shape the stack: OneEthos (headline), Hugging Face, Databricks, Neon.
Each sponsor tool does one distinct, real job — Databricks batch-crunches, Hugging Face
interprets, Neon serves, the map is the product.

## Architecture (clients only talk to the API)

```
Mobile (Expo) --\
                 >--> API (Next.js route handlers on Vercel) --> Neon Postgres (PostGIS, pgvector, branches)
Web (Next.js) --/        |--> Photo classifier (Docker via tunnel)
                         |--> HF Inference Providers (small LLM, rationales)
                         '--> Neon Object Storage (photos)
Databricks (batch) --> CSV export --> db/load_gold.py --> Neon
```

- Clients never touch the DB, storage, classifier, or Databricks directly.
- Databricks never calls the apps; its outputs reach Neon via CSV + `db/load_gold.py`.

## Repo layout and ownership — stay in your folder

| Folder | Owner | Language |
| --- | --- | --- |
| `apps/web` pages + components | Web developer | TypeScript |
| `apps/web/app/api`, `db/`, `classifier/` | API + Neon developer | TS / Python |
| `apps/mobile` | Mobile developer | TypeScript |
| `data/` | Databricks / data developer | Python |

- `docs/api.md` = the API contract. `mocks/` = sample JSON, one per endpoint.
- Everything is TypeScript except `classifier/`, `db/*.py`, `data/*.py` (Python).
- Do NOT scaffold a second Next.js project. Keep new files in the folder that owns them.

## API contract rules (`docs/api.md` + `mocks/` are authoritative)

- JSON everywhere. Errors: `{"error": {"code": "...", "message": "..."}}`.
- Every call takes `city=<slug>` (`orlando`, `nyc`, `chicago`); POST bodies carry it as a field.
- Mobile sends anonymous `X-Device-Id`. Staff endpoints need `X-Staff-Key` (env `STAFF_KEY`).
  Demo-grade protection only. No accounts, ever.
- Labels: `overflowing_can`, `bag_pile`, `illegal_dumping`, `clean`, `not_trash`, plus
  `unclassified` when the classifier is unreachable. Apps render unknown labels as "received".
- Severity: int 0-3. Status: `received`, `reviewed`, `resolved`.
- Coordinates `lat`/`lng` WGS84; distances in metres. Photos: JPEG, longest side <= 1600 px, field `photo`.
- Every report/ticket carries `is_synthetic` (bool); a ticket is synthetic when all its reports
  are. UIs show a "demo data" label when true.
- `USE_MOCKS=1` makes route handlers return files from `mocks/`. Flip to `0` only after the
  Databricks gold tables are loaded.
- **If you change a response shape, update `docs/api.md`, `mocks/`, and both clients'
  `lib/types.ts` in the same change.** Prefer editing the contract + mocks first, then code.

Endpoints: `GET /api/cities`, `POST /api/reports`, `GET /api/reports/nearby`,
`GET /api/reports/{id}`, `GET /api/tickets`, `PATCH /api/tickets/{id}`, `GET /api/cells`,
`GET /api/recommendations`, `POST /api/scenarios`, `DELETE /api/scenarios/{id}`, `GET /api/health`.

## Data model (authoritative: `db/migrations/001_init.sql`)

Tables: `cities`, `tickets`, `reports` (geography point, `embedding vector(512)`, `is_synthetic`),
`bins` (`source`: osm | city | proposed), `cell_scores` (H3 cell + centroid, `expected_overflow`,
`reports_per_1k`, `under_reported`, `demand`), `bin_candidates` (rank, gain, nearest_bin_m,
nearby_reports, rationale).

Report flow (`POST /api/reports`): validate -> upload photo -> POST to `CLASSIFIER_URL/classify`
with `X-Classifier-Key` -> duplicate query (within 50 m, last 7 days, cosine similarity ~0.85) ->
attach to a ticket (raise count) or create one -> respond. Classifier silent ~10 s => save
`unclassified`, severity 1.

Scenario flow: create a Neon branch, insert `source='proposed'` bins, run coverage query on the
branch, return before/after, delete the branch. Free plan: 10 branches per project incl. main.

## Stack specifics

- Web + API: Next.js (App Router, v16) + TypeScript in `apps/web`. Map: MapLibre via react-map-gl;
  heatmap: deck.gl `H3HexagonLayer` + h3-js; fetching: TanStack Query; validation: zod.
- Mobile: Expo (React Native) + Expo Router in `apps/mobile`, run in Expo Go.
- DB: Neon Postgres + PostGIS + pgvector; API driver `@neondatabase/serverless`.
- Photos: Neon Object Storage (S3-compatible), bucket `report-photos`, `@aws-sdk/client-s3`
  with `forcePathStyle: true`. Fallback: Vercel Blob.
- Classifier: FastAPI + zero-shot CLIP (`openai/clip-vit-base-patch32`, 512-dim) in Docker.
- LLM rationales: `huggingface_hub.InferenceClient`, small instruct model; prompt passes only
  numbers so it cannot invent facts. Only top 20 sites/city, cached in `bin_candidates.rationale`,
  template fallback.

## Next.js note (from `apps/web/AGENTS.md`)

This Next.js (v16) has breaking changes vs. common training data. Before writing web code, read
the relevant guide in `node_modules/next/dist/docs/` (resolved from the `apps/web` dir). The agent
rules block in `AGENTS.md` is regenerated by `next dev`; commit it with your work to keep the tree clean.

## Commands (Windows / PowerShell)

```powershell
# env var syntax in PowerShell
psql $env:DATABASE_URL -f db/migrations/001_init.sql

cd apps/web; npm run dev          # web + api
cd apps/mobile; npx expo start    # mobile (add --tunnel if wifi blocks it)

docker build -t trash-classifier classifier/
docker run -d --name classifier -p 7860:7860 -e CLASSIFIER_KEY=<secret> --restart unless-stopped trash-classifier
cloudflared tunnel --url http://localhost:7860   # or: ngrok http 7860

python data/fetch_city.py orlando
python db/seed.py
python db/load_gold.py orlando
python data/eval.py
bash scripts/smoke.sh             # needs curl, jq, psql (Git Bash/WSL)
```

- In PowerShell `curl` aliases `Invoke-WebRequest`; use `curl.exe` for the docs' curl examples.
- Verify web changes with `cd apps/web; npm run build` and `npm run lint`.

## Environment / secrets

Secrets live in `.env.local` (never commit). Keys: `DATABASE_URL`, `NEON_API_KEY`,
`NEON_PROJECT_ID`, `HF_TOKEN`, `CLASSIFIER_URL`, `CLASSIFIER_KEY`, `STORAGE_*`, `PHOTO_BASE_URL`,
`STAFF_KEY`, `USE_MOCKS`; mobile `EXPO_PUBLIC_API_BASE`; web `NEXT_PUBLIC_MAP_STYLE_URL`,
`NEXT_PUBLIC_USE_CACHE`. **Never put `NEON_API_KEY` or any secret in web/mobile client code —
only API routes use it.** Do not echo secret values back.

## Gotchas (do not rediscover)

- School wifi blocks outbound TCP 5432 (443 works). `psql`, `seed.py`, `load_gold.py` fail there;
  run the migration in the Neon Console SQL Editor and run those scripts from a hotspot. The
  Vercel-hosted API is unaffected. **If asked to run scripts that hit Neon directly, remind the
  user about school wifi.**
- Neon Free: 0.5 GB DB storage (aggregates only — never raw 311 rows or photos), 100 CU-hours/mo,
  10 branches, scale-to-zero (warm up before demos). Object Storage is a separate ~5 GB allowance.
- Neon on PG 18 may fail `CREATE EXTENSION postgis`/`vector`; recreate on 17 if so.
- Databricks Free Edition: serverless only, restricted outbound. Default path: fetch locally ->
  upload to a volume -> export gold CSV -> `db/load_gold.py`.
- HF free Inference credit is tiny; rely on event credit, cache rationales, template fallback.
- Classifier host laptop: plugged in, sleep off, tunnel running. A quick tunnel's URL changes on
  restart — update `CLASSIFIER_URL` on Vercel and redeploy. Keep a standby laptop.

## City adapter

One YAML per city in `data/cities/` (slug, name, center, bbox west/south/east/north, census FIPS,
osm bins tag, complaints source, bins source). Adding a city = config + data load, no code changes.
Dataset facts (checked 2026-10-10): NYC 311 id `erm2-nwe9`, DSNY Litter Basket `8znf-7b2c`;
Chicago 311 id `v6vf-nfxy` (NOT the historical `me59-5fac`). NYC complaint-type strings are
unverified — group-by before filling `category_map`. Target is litter-related complaint density,
not "bin overflow".

## Test photos / privacy

Originals with GPS live in `data/test_photos_raw/` (gitignored, never published).
`data/prep_photos.py` (rotate, resize to 1600 px, strip EXIF) writes `.jpg` into
`data/test_photos/` — never hand-edit those, rerun the script. `labels.csv` (filename, label,
severity, staged) is hand-written and never overwritten. Keep one photo named `overflow1.jpg`
(smoke test). No faces or license plates; staged photos must be marked and disclosed.

## Working rules for Kiro

- Hackathon time budget: simplest thing that works. No Redux, microservices, extra backend
  language, or login/accounts.
- Do not invent facts about datasets, ids, limits, or API formats. If something is unverified,
  say so and give a way to check. Known-unverified: Neon public object URL format, exact tunnel
  commands, Vercel function timeout (`POST /api/reports` waits on the classifier), CLIP via HF
  Inference Providers.
- Seeded/demo data must be flagged `is_synthetic` and labeled in the UI. Never present synthetic
  data as real.
- Privacy: no accounts or names; strip EXIF except coordinates; photos sit at public URLs, so
  never upload test photos with identifiable faces.
- Match existing code style; do not add dependencies without saying why.
- Only create commits when the user explicitly asks.

## Build order and gates

1. Neon (project, key, schema, bucket) -> 2. mock API deployed -> 3. classifier container + tunnel
   + labeled photos. **Gate 1:** contract committed, mock API URL shared, data path works.
4. Seed demo data -> 5. real API handlers. **Gate 2:** a phone report appears on the dashboard.
6. Databricks (fetch, silver, model, gold, load, reasons). **Gate 3:** ranked bins + scenario for
   Orlando and one more city.
7. Smoke tests, cache mode, rehearsal. **Gate 4:** code freeze, demo rehearsed twice.

Status checklist lives in `.claude/CLAUDE.md` — update it there as work lands.
