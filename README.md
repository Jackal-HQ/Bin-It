# Bin-It

**Trash Overflow Planner** — residents photo-report overflowing trash bins from a
phone; city staff get a web dashboard that ranks where new bins would help most.

Home city is **Orlando, FL**; **NYC** and **Chicago** prove it ports by config alone.
Hackathon project for the OneEthos "Innovation for Good" track (with Hugging Face,
Databricks, and Neon).

> The core insight: raw 311 counts measure *who reports*, not *where trash is*.
> Bin-It predicts expected overflow per area from objective proxies, compares it to
> reports per 1,000 residents, flags **under-reported** areas, and recommends bin
> placements. All projected changes are shown as **estimates**, never measured outcomes.

## How it works

```text
Mobile (Expo) --\
                 >--> API (Next.js route handlers on Vercel) --> Neon Postgres (PostGIS, pgvector, branches)
Web (Next.js) --/        |--> Photo classifier (FastAPI + CLIP, Docker via tunnel)
                         |--> Hugging Face Inference (small LLM, recommendation rationales)
                         '--> Neon Object Storage (photos)
Databricks (batch) --> CSV export --> db/load_gold.py --> Neon
```

Clients only ever talk to the API. They never touch the database, storage, classifier,
or Databricks directly. Databricks outputs reach Neon as exported CSV loaded by
`db/load_gold.py`.

## Stack

| Part | Tech |
| --- | --- |
| Web dashboard + API | Next.js (App Router, v16) + TypeScript — `apps/web` |
| Map / heatmap | MapLibre (react-map-gl), deck.gl `H3HexagonLayer` + h3-js |
| Mobile | Expo SDK 57 (React Native) + Expo Router, runs in Expo Go — `apps/mobile`. Nearby map: MapLibre GL JS + OpenFreeMap tiles in a WebView (no map API key) |
| Database | Neon Postgres + PostGIS + pgvector |
| Photo storage | Neon Object Storage (S3-compatible), bucket `report-photos` |
| Classifier | FastAPI + zero-shot CLIP (`openai/clip-vit-base-patch32`, 512-dim) — `classifier` |
| LLM rationales | `huggingface_hub` Inference Providers (numbers-only prompt) |
| Batch modeling | Databricks (H3 res 9, MLflow) — `data/notebooks` *(planned)* |

Everything is TypeScript except `classifier/`, `db/*.py`, and `data/*.py` (Python).

## Repo layout

```text
apps/web/        Next.js dashboard pages/components + app/api route handlers
apps/mobile/     Expo app: Report + Nearby tabs, ticket/report detail
classifier/      FastAPI + CLIP container (Dockerfile, app.py, requirements.txt)
db/              migrations/001_init.sql, seed.py, load_gold.py, reset_demo.sql
data/            cities/*.yaml, test_photos/ (+labels.csv), eval.py, fetch_city.py
scripts/         test_upload.py, smoke.sh (smoke planned)
docs/api.md      the authoritative API contract
mocks/           sample JSON, one file per endpoint
requirements.txt Python deps for data/*.py and db/*.py (the classifier has its own)
.claude/CLAUDE.md  full project brief (source of truth for intent)
KIRO.md          operating guide for the Kiro CLI agent
```

## API

The contract in [`docs/api.md`](docs/api.md) and the samples in `mocks/` are
authoritative. Endpoints:

| Endpoint | Used by | Purpose | State |
| --- | --- | --- | --- |
| `GET /api/cities` | both | cities with center, bbox | live |
| `POST /api/reports` | mobile | multipart photo report → classified, maybe merged ticket | live |
| `GET /api/reports/nearby` | mobile | tickets + bins around a point or inside a bbox | live |
| `GET /api/reports/{id}` | mobile | one report | live |
| `GET /api/tickets` | web | queue; filter by city/status/label | live |
| `PATCH /api/tickets/{id}` | web | change status (staff key) | live |
| `GET /api/health` | both | database + classifier status | live |
| `GET /api/cells` | web | per-cell scores keyed by H3 id | live |
| `GET /api/recommendations` | web | ranked new-bin sites with `rationale` | live |
| `POST /api/scenarios`, `DELETE /api/scenarios/{id}` | web | what-if on a Neon branch | mock only (`501` with `USE_MOCKS=0`) |

Conventions: JSON everywhere; errors are `{"error": {"code": "...", "message": "..."}}`;
every call takes `city=<slug>` (`orlando`, `nyc`, `chicago`). Mobile sends an anonymous
`X-Device-Id`; staff endpoints need `X-Staff-Key` (env `STAFF_KEY`; `PATCH` returns `401`
when it is unset). No accounts, ever. Set `USE_MOCKS=1` to make route handlers serve files
from `mocks/`; set it to `0` for real data.

A new report merges into an existing ticket when it is in the same city, within 50 m, from
the last 7 days, on a ticket that is not `resolved`, and its photo embedding has cosine
similarity ≥ 0.85. Reports the classifier could not label (`unclassified`) never merge.

## Getting started (Windows / PowerShell)

### 1. Web + API

```powershell
cd apps/web
npm install
npm run dev        # http://localhost:3000, serves mocks when USE_MOCKS=1
```

### 2. Database schema (Neon)

```powershell
psql $env:DATABASE_URL -f db/migrations/001_init.sql
```

The schema (`db/migrations/001_init.sql`) creates `cities`, `tickets`, `reports`
(with `embedding vector(512)` and `is_synthetic`), `bins`, `cell_scores`, and
`bin_candidates`, plus GiST and HNSW indexes.

> **School / venue wifi blocks outbound TCP 5432.** `psql`, `db/seed.py`, and
> `db/load_gold.py` fail there. Run the migration in the Neon Console SQL Editor and
> run the Python scripts from a hotspot. The Vercel-hosted API is unaffected.

### 3. Classifier

```powershell
docker build -t trash-classifier classifier/
docker run -d --name classifier -p 7860:7860 -e CLASSIFIER_KEY=<secret> --restart unless-stopped trash-classifier
cloudflared tunnel --url http://localhost:7860   # or: ngrok http 7860
```

The classifier (`classifier/app.py`) uses CLIP zero-shot classification: each label is
an average of several prompt phrasings, label and severity are scored independently, and
`clean`/`not_trash` are pinned to severity 0. `POST /classify` returns `label`,
`label_confidence`, `severity` (0-3), and the 512-dim `embedding`.

### 4. Python environment

Use Python 3.12 (newer versions often lack prebuilt wheels for `psycopg[binary]` and `torch`).

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt       # data/*.py and db/*.py (requests, boto3, psycopg, ...)
python data/eval.py                   # classifier accuracy on the labeled photos
```

`db/seed.py` and `db/load_gold.py` read `.env.local` from the repo root themselves
(`python-dotenv`), so run them from the repo root. Add `pip install -r classifier/requirements.txt`
only if you want to run CLIP locally.

### 5. Seed demo data

```powershell
python db/seed.py        # needs the classifier tunnel up + storage and DATABASE_URL env vars
```

Loads the three cities from `data/cities/*.yaml`, then creates demo reports from
`data/test_photos/labels.csv`, all flagged `is_synthetic`: Orlando gets every photo in 8
clusters, NYC and Chicago get every third photo in 6 clusters each. Each photo is uploaded
and classified once. It is safe to rerun (it clears its own `device_id = 'seed'` rows first).

### 6. Reset the demo between rehearsals

Run `db/reset_demo.sql` in the Neon SQL Editor. It deletes reports sent from the device ids
`test` and `demo`, removes tickets left empty, and recomputes ticket counts, severity and
status, so the seeded baseline comes back. Reports made from a phone use a random device id,
so add that id to the list in the file if you want them removed too.

### 7. Load Databricks results into Neon

```powershell
python db/load_gold.py orlando     # then nyc, chicago
```

Reads `data/gold/<slug>/cell_scores.csv`, `bins.csv` and `bin_candidates.csv` and replaces that
city's rows in one transaction (a bad file changes nothing). Required columns:

| File | Columns |
| --- | --- |
| `cell_scores.csv` | `h3_cell, lat, lng, expected_overflow, reports_per_1k, under_reported, demand` |
| `bins.csv` | `lat, lng, source` (`osm` or `city`) |
| `bin_candidates.csv` | `rank, lat, lng, gain, nearest_bin_m, nearby_reports` |

`lat`/`lng` are the cell centroid for cells. Rerunning clears `bin_candidates.rationale`, so
rerun `python data/explain.py <slug>` afterwards (see below). Mobile only shows tickets and bins; cell scores and
recommendations are dashboard features.

### 8. Write bin-site rationales

```powershell
python data/explain.py orlando             # or: all
python data/explain.py orlando --no-llm    # template sentences only
```

Fills `bin_candidates.rationale` for every site. The top 20 sites per city get a one-sentence
explanation from a small Hugging Face chat model (`HF_TOKEN`, optional `HF_MODEL`); the prompt
contains only numbers from the database (nearest bin distance, nearby reports, where the cell's
estimated overflow ranks in the city, under-reported flag). Other sites, and any LLM failure,
get a template sentence from the same facts. Existing rationales are kept unless `--force`.

### 9. Mobile app

```powershell
cd apps/mobile
npm install
copy .env.local.example .env.local   # set EXPO_PUBLIC_API_BASE to the deployed API URL
npx expo start -c                    # add --tunnel only if wifi blocks phone-to-laptop traffic
```

The app targets **Expo SDK 57**, so use the current Expo Go from the store. See
[`apps/mobile/README.md`](apps/mobile/README.md) for screens, how the map works and
troubleshooting.

> In PowerShell, `curl` is an alias for `Invoke-WebRequest`; use `curl.exe` for the
> curl examples in `docs/api.md`.

## Environment

Secrets live in `.env.local` and are **never committed**. Keys: `DATABASE_URL`,
`NEON_API_KEY`, `NEON_PROJECT_ID`, `HF_TOKEN`, `CLASSIFIER_URL`, `CLASSIFIER_KEY`,
`STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`,
`STORAGE_BUCKET`, `AWS_REGION`, `PHOTO_BASE_URL`, `STAFF_KEY`, `USE_MOCKS`. Mobile:
`EXPO_PUBLIC_API_BASE` (public, inlined into the app bundle). Web: `NEXT_PUBLIC_MAP_STYLE_URL`,
optional `NEXT_PUBLIC_USE_CACHE`. `apps/web/.env.local` serves the Next.js app and the Python
scripts read the repo-root `.env.local`; keep both in sync. Restart the dev server after
changing either.

**`NEON_API_KEY` and other secrets must never appear in web or mobile client code —
only API routes use them.**

## Privacy

No accounts and no names. Photos may show passers-by and are served from public URLs,
so test photos must not contain identifiable faces or license plates. EXIF is stripped
(except coordinates) before any photo is published. Seeded/demo data is flagged
`is_synthetic` and labeled as "demo data" in the UI — synthetic data is never presented
as real.

## Status

| Step | State |
| --- | --- |
| Neon project, schema, bucket | done: schema loaded, photos upload to the bucket |
| Mock API | done: handlers serve `mocks/` behind `USE_MOCKS`, deployed on Vercel |
| Classifier container + tunnel | done: CLIP zero-shot behind a tunnel (about 66% label accuracy on our 73 photos at last measurement) |
| Seed data | done: Orlando, NYC and Chicago demo reports (`db/seed.py`), flagged synthetic |
| Real API handlers | partly done: cities, health, reports, reports/nearby, reports/{id}, tickets, tickets/{id} are live; only scenarios still mock-only |
| Databricks pipeline + gold load | loader written (`db/load_gold.py`); notebooks and CSV exports not in the repo yet |
| Mobile app | done: report flow, nearby map and list, ticket and report detail |
| Web dashboard | in progress (see `apps/web`) |
| Smoke tests, cache mode, recorded demo | planned (`scripts/smoke.sh`) |

See [`.claude/CLAUDE.md`](.claude/CLAUDE.md) for the full brief and build gates.

## License

MIT — see [LICENSE](LICENSE).
