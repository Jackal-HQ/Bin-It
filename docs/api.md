# API contract

Authoritative. If `mocks/` disagrees with this file, fix both in the same change.

All endpoints are served by `apps/web/app/api/**` (Next.js route handlers on Vercel).
Clients (mobile, web) only ever talk to this API — never directly to the database,
storage, classifier, or Databricks.

## Conventions

- JSON everywhere. Errors: `{"error": {"code": "...", "message": "..."}}`.
- Every call takes `city=<slug>` (`orlando`, `nyc`, `chicago`); POST bodies carry it as a field.
- Mobile sends anonymous `X-Device-Id` (random UUID kept on the phone).
- Staff endpoints require `X-Staff-Key` matching env `STAFF_KEY`. Demo-grade protection only. No accounts, ever.
- Labels: `overflowing_can`, `bag_pile`, `illegal_dumping`, `clean`, `not_trash`, plus
  `unclassified` when the classifier is unreachable. Apps render unknown labels as "received".
- Severity: int 0-3. Status: `received`, `reviewed`, `resolved`.
- Coordinates `lat`/`lng` WGS84; distances in metres.
- Photos: JPEG, longest side <= 1600 px, field `photo`.
- Every report/ticket object carries `is_synthetic` (bool). A ticket is synthetic when all
  its reports are (`bool_and`). UIs show a "demo data" label when true.
- `USE_MOCKS=1` makes route handlers return files from `mocks/`, one per endpoint below.
  Flip to `0` only after the Databricks gold tables are loaded.
- If you change a response shape: update this file, `mocks/`, and both clients'
  `lib/types.ts` in the same change.

## Endpoints

### GET /api/cities

Used by: both. Cities with center, bbox.

Response `200`:
```json
{
  "cities": [
    { "slug": "orlando", "name": "Orlando, FL", "center": { "lat": 28.5383, "lng": -81.3792 }, "bbox": [-81.51, 28.40, -81.25, 28.65] }
  ]
}
```

Mock: `mocks/cities.json`

### POST /api/reports

Used by: mobile. Multipart photo report -> classified, maybe merged into an existing ticket.

Request: multipart/form-data. Fields: `city`, `lat`, `lng`, `note` (optional), `photo` (file).
Headers: `X-Device-Id`.

Response `201`:
```json
{
  "report": { "id": "r_01", "ticket_id": "t_01", "city": "orlando", "lat": 28.5383, "lng": -81.3792, "label": "overflowing_can", "severity": 2, "is_synthetic": false, "created_at": "2026-10-10T12:00:00Z" },
  "ticket": { "id": "t_01", "status": "received", "report_count": 1, "max_severity": 2, "merged": false }
}
```

If the classifier does not answer in ~10s: save with `label: "unclassified"`, `severity: 1`.

Merging: a report joins an existing ticket when it is in the same city, within 50 m, from the last
7 days, on a ticket that is not `resolved`, and its photo embedding has cosine similarity >= 0.85.
Unclassified reports (no embedding) never merge. Errors: `400` invalid fields / unknown city /
missing or non-JPEG photo, `413` photo over 5 MB, `502` photo storage failed.

Mock: `mocks/reports-create.json`

### GET /api/reports/nearby

Used by: mobile. Tickets + bins around a point, or inside `bbox`.

Query: `city`, either (`lat`, `lng`, optional `radius_m`, default 500, max 5000) or
`bbox=west,south,east,north`. Resolved tickets are left out; `proposed` bins are never returned.
Up to 200 tickets and 200 bins.

Each ticket carries `photo_url`: the photo of its most severe (then most recent) report,
so clients can show a thumbnail without a second request. It is `null` when no report on
the ticket has a stored photo.

Response `200`:
```json
{
  "tickets": [ { "id": "t_01", "lat": 28.5383, "lng": -81.3792, "label": "overflowing_can", "max_severity": 2, "report_count": 3, "status": "received", "photo_url": "https://.../report-photos/r_01.jpg", "is_synthetic": true } ],
  "bins": [ { "id": "b_01", "lat": 28.5390, "lng": -81.3800, "source": "osm" } ]
}
```

Mock: `mocks/reports-nearby.json`

### GET /api/reports/{id}

Used by: mobile. One report.

Response `200`:
```json
{ "report": { "id": "r_01", "ticket_id": "t_01", "city": "orlando", "lat": 28.5383, "lng": -81.3792, "label": "overflowing_can", "severity": 2, "note": null, "photo_url": "https://.../report-photos/r_01.jpg", "is_synthetic": false, "created_at": "2026-10-10T12:00:00Z" } }
```

Mock: `mocks/report.json`

### GET /api/tickets

Used by: web. Queue; filter `city`/`status`/`label`; sorted by severity, then report count, descending.

Query: `city`, `status` (optional), `label` (optional).

Each ticket carries `photo_url`, chosen the same way as in `/api/reports/nearby` (the photo of its
most severe, then most recent, report), or `null` when no report on it has a stored photo.

Response `200`:
```json
{
  "tickets": [
    { "id": "t_01", "lat": 28.5383, "lng": -81.3792, "label": "overflowing_can", "max_severity": 3, "report_count": 5, "status": "received", "first_seen": "2026-10-08T09:00:00Z", "last_seen": "2026-10-10T11:00:00Z", "photo_url": "https://.../report-photos/r_05.jpg", "is_synthetic": true }
  ]
}
```

Mock: `mocks/tickets.json`

### PATCH /api/tickets/{id}

Used by: web. Change status (staff key required). Headers: `X-Staff-Key`.
`401` when the key is missing/wrong (or `STAFF_KEY` is unset), `404` for an unknown ticket.

Request:
```json
{ "status": "reviewed" }
```

Response `200`:
```json
{ "ticket": { "id": "t_01", "status": "reviewed" } }
```

Mock: `mocks/ticket-patch.json`

### GET /api/cells

Used by: web. Per-cell scores keyed by H3 id. Accepts `bbox`.

Query: `city`, `bbox` (optional, `west,south,east,north`, filters by cell centroid). Up to 20,000 cells.
`reports_per_1k` is `null` when the pipeline has no population data for the city; then
`under_reported` is `false` for every cell.

Response `200`:
```json
{
  "cells": [
    { "h3_cell": "892a1008003ffff", "lat": 28.5383, "lng": -81.3792, "expected_overflow": 0.62, "reports_per_1k": 0.21, "under_reported": true, "demand": 0.71 }
  ]
}
```

Mock: `mocks/cells.json`

### GET /api/recommendations

Used by: web. Ranked new-bin sites with `rationale`.

Query: `city`. Ordered by `rank`, up to 100 rows. `rationale` is an empty string until
`python data/explain.py <slug>` has run.

Response `200`:
```json
{
  "recommendations": [
    { "rank": 1, "lat": 28.5400, "lng": -81.3810, "gain": 0.18, "nearest_bin_m": 410, "nearby_reports": 6, "rationale": "High foot traffic near a transit stop with no bin within 400m and repeated overflow reports." }
  ]
}
```

Mock: `mocks/recommendations.json`

### POST /api/scenarios

Used by: web. What-if on a Neon branch; the branch is always deleted afterward (by the client calling `DELETE /api/scenarios/{id}`).

Request:
```json
{ "city": "orlando", "proposed_bins": [{ "lat": 28.5400, "lng": -81.3810 }] }
```

Response `201`:
```json
{
  "scenario": {
    "id": "s_01",
    "branch_id": "br_demo",
    "before": { "avg_distance_m": 520, "coverage_150m_pct": 41 },
    "after": { "avg_distance_m": 310, "coverage_150m_pct": 58 }
  }
}
```

Mock: `mocks/scenario-create.json`

### DELETE /api/scenarios/{id}

Used by: web. Deletes the scenario's Neon branch.

Response `204`: empty body.

### GET /api/health

Used by: both. Database + classifier status.

Response `200`:
```json
{ "database": "ok", "classifier": "ok", "use_mocks": true }
```

Mock: `mocks/health.json`
