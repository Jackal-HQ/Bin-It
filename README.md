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

```
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
| Mobile | Expo (React Native) + Expo Router — `apps/mobile` *(planned)* |
| Database | Neon Postgres + PostGIS + pgvector |
| Photo storage | Neon Object Storage (S3-compatible), bucket `report-photos` |
| Classifier | FastAPI + zero-shot CLIP (`openai/clip-vit-base-patch32`, 512-dim) — `classifier` |
| LLM rationales | `huggingface_hub` Inference Providers (numbers-only prompt) |
| Batch modeling | Databricks (H3 res 9, MLflow) — `data/notebooks` *(planned)* |

Everything is TypeScript except `classifier/`, `db/*.py`, and `data/*.py` (Python).

## Repo layout

```
apps/web/        Next.js dashboard pages/components + app/api route handlers
apps/mobile/     Expo app                                   (planned)
classifier/      FastAPI + CLIP container (Dockerfile, app.py, requirements.txt)
db/              migrations/001_init.sql, seed.py, load_gold.py (load_gold planned)
data/            cities/*.yaml, test_photos/ (+labels.csv), eval.py, fetch scripts
scripts/         test_upload.py, smoke.sh (smoke planned)
docs/api.md      the authoritative API contract
mocks/           sample JSON, one file per endpoint
.claude/CLAUDE.md  full project brief (source of truth for intent)
KIRO.md          operating guide for the Kiro CLI agent
```

## API

The contract in [`docs/api.md`](docs/api.md) and the samples in `mocks/` are
authoritative. Endpoints:

| Endpoint | Used by | Purpose |
| --- | --- | --- |
| `GET /api/cities` | both | cities with center, bbox |
| `POST /api/reports` | mobile | multipart photo report → classified, maybe merged ticket |
| `GET /api/reports/nearby` | mobile | tickets + bins around a point or inside a bbox |
| `GET /api/reports/{id}` | mobile | one report |
| `GET /api/tickets` | web | queue; filter by city/status/label |
| `PATCH /api/tickets/{id}` | web | change status (staff key) |
| `GET /api/cells` | web | per-cell scores keyed by H3 id |
| `GET /api/recommendations` | web | ranked new-bin sites with `rationale` |
| `POST /api/scenarios`, `DELETE /api/scenarios/{id}` | web | what-if on a Neon branch |
| `GET /api/health` | both | database + classifier status |

Conventions: JSON everywhere; errors are `{"error": {"code": "...", "message": "..."}}`;
every call takes `city=<slug>` (`orlando`, `nyc`, `chicago`). Mobile sends an anonymous
`X-Device-Id`; staff endpoints need `X-Staff-Key`. No accounts, ever. Set `USE_MOCKS=1`
to make route handlers serve files from `mocks/`.

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

### 4. Seed demo data

```powershell
python db/seed.py        # needs the classifier + storage env vars; flags all rows is_synthetic
```

### Python helpers

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r classifier/requirements.txt   # or data/db script deps
python data/eval.py                           # classifier accuracy on labeled photos
```

> In PowerShell, `curl` is an alias for `Invoke-WebRequest`; use `curl.exe` for the
> curl examples in `docs/api.md`.

## Environment

Secrets live in `.env.local` and are **never committed**. Keys: `DATABASE_URL`,
`NEON_API_KEY`, `NEON_PROJECT_ID`, `HF_TOKEN`, `CLASSIFIER_URL`, `CLASSIFIER_KEY`,
`STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`,
`STORAGE_BUCKET`, `PHOTO_BASE_URL`, `STAFF_KEY`, `USE_MOCKS`. Mobile:
`EXPO_PUBLIC_API_BASE`. Web: `NEXT_PUBLIC_MAP_STYLE_URL`, optional
`NEXT_PUBLIC_USE_CACHE`.

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
| Neon project, schema, bucket | migration SQL present (`db/migrations/001_init.sql`) |
| Mock API | route handlers serve `mocks/` behind `USE_MOCKS` |
| Classifier container + tunnel | `classifier/` built (CLIP zero-shot) |
| Seed data | `db/seed.py` present |
| Real API handlers | stubbed (`501 not_implemented`) |
| Databricks pipeline + gold load | planned (`db/load_gold.py`, `data/notebooks/`) |
| Mobile app | planned (`apps/mobile/`) |
| Smoke tests, cache mode, recorded demo | planned (`scripts/smoke.sh`) |

See [`.claude/CLAUDE.md`](.claude/CLAUDE.md) for the full brief and build gates.

## License

MIT — see [LICENSE](LICENSE).
