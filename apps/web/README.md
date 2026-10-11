# Bin-It web (Next.js)

The staff dashboard **and** the API. Next.js 16 (App Router) + TypeScript. The route handlers
under `app/api/**` are the only backend: the mobile app and the dashboard both call them, and
they are the only code that touches Neon, object storage and the classifier.

> This is a newer Next.js than most training data covers. Before changing routing, caching or
> route-handler code, read the guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).
> `next.config.ts` enables `cacheComponents`, `params` in route handlers is a Promise, and
> handlers that touch the database or the request run at request time.

## Run

```powershell
cd apps/web
npm install
npm run dev          # http://localhost:3000
npm run lint
npx tsc --noEmit
```

## Environment (`apps/web/.env.local`, never commit)

| Var | Used for |
| --- | --- |
| `USE_MOCKS` | `1` serves `mocks/*.json`; `0` uses the real database |
| `DATABASE_URL` | pooled Neon connection string |
| `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `AWS_REGION` | Neon Object Storage (S3-compatible, path-style) |
| `PHOTO_BASE_URL` | public base URL of the bucket, stored on each report |
| `CLASSIFIER_URL`, `CLASSIFIER_KEY` | photo classifier behind the tunnel |
| `STAFF_KEY` | required by `PATCH /api/tickets/{id}` (`401` when unset) |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | scenario branches (not wired yet) |

Restart `npm run dev` after editing it. Secrets must only be read in route handlers and
`lib/server.ts`, never in client components.

## API

The contract is `docs/api.md` (and `mocks/`); this folder implements it.

| Route | State |
| --- | --- |
| `GET /api/cities`, `GET /api/health` | live |
| `POST /api/reports` | live: validate → upload photo → classify → duplicate check → attach or create ticket |
| `GET /api/reports/nearby`, `GET /api/reports/{id}` | live |
| `GET /api/tickets`, `PATCH /api/tickets/{id}` | live |
| `GET /api/cells`, `GET /api/recommendations`, `POST/DELETE /api/scenarios` | mock only; `501` when `USE_MOCKS=0` |

Every handler keeps the `if (mocksEnabled()) return mocks...` branch first. Shared server
code is in `lib/server.ts` (Neon query helper, error helper, photo upload, classifier call).
Keep `lib/types.ts` in sync with `docs/api.md` and `apps/mobile/lib/types.ts`.

### Try it (PowerShell; use `curl.exe`)

```powershell
curl.exe localhost:3000/api/health
curl.exe "localhost:3000/api/tickets?city=orlando"
curl.exe -X POST localhost:3000/api/reports -H "X-Device-Id: test" -F city=orlando -F lat=28.54 -F lng=-81.38 -F "photo=@data/test_photos/overflow1.jpg;type=image/jpeg"
curl.exe -X PATCH localhost:3000/api/tickets/<id> -H "X-Staff-Key: <STAFF_KEY>" -H "Content-Type: application/json" -d '{\"status\":\"reviewed\"}'
```

Run the POST from the repo root so the photo path resolves; send the same photo twice and the
second response should say `"merged": true`. Photos must be JPEG and at most 5 MB (Vercel may
cap request bodies lower; check with a real phone photo). The tests above write to Neon; clean
up with `db/reset_demo.sql`.

## Deploy (Vercel)

Root directory `apps/web`; add every variable above (set `USE_MOCKS=0` for real data). The
database needs port 5432 reachable from Vercel, which school wifi does not affect. Unverified:
the function timeout on our plan, since `POST /api/reports` waits up to about 10 s for the
classifier.
