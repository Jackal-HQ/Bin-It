import { NextResponse } from "next/server";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { apiError, findCity, query } from "@/lib/server";

export async function GET(request: Request) {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.cells);
  }
  const params = new URL(request.url).searchParams;
  const city = await findCity(params.get("city"));
  if (!city) return apiError("unknown_city", "Query param `city` is required and must be a known slug", 400);

  // Optional bbox=west,south,east,north limits cells by centroid.
  let bbox: number[] | null = null;
  const bboxRaw = params.get("bbox");
  if (bboxRaw) {
    bbox = bboxRaw.split(",").map(Number);
    if (bbox.length !== 4 || bbox.some((n) => !Number.isFinite(n)) || bbox[0] >= bbox[2] || bbox[1] >= bbox[3]) {
      return apiError("invalid_bbox", "bbox must be west,south,east,north", 400);
    }
  }

  const rows = await query(
    `SELECT h3_cell, ST_Y(centroid::geometry) AS lat, ST_X(centroid::geometry) AS lng,
            expected_overflow, reports_per_1k, under_reported, demand
       FROM cell_scores
      WHERE city_id = $1
        AND ($2::float8 IS NULL
             OR centroid::geometry && ST_MakeEnvelope($2, $3, $4, $5, 4326))
      ORDER BY h3_cell
      LIMIT 20000`,
    [city.id, bbox?.[0] ?? null, bbox?.[1] ?? null, bbox?.[2] ?? null, bbox?.[3] ?? null],
  );
  return NextResponse.json({
    cells: rows.map((r) => ({
      h3_cell: r.h3_cell,
      lat: Number(r.lat),
      lng: Number(r.lng),
      expected_overflow: Number(r.expected_overflow ?? 0),
      // null until the pipeline joins population/311 data
      reports_per_1k: r.reports_per_1k == null ? null : Number(r.reports_per_1k),
      under_reported: Boolean(r.under_reported),
      demand: Number(r.demand ?? 0),
    })),
  });
}
