import { NextResponse } from "next/server";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { apiError, findCity, query } from "@/lib/server";

export async function GET(request: Request) {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.recommendations);
  }
  const params = new URL(request.url).searchParams;
  const city = await findCity(params.get("city"));
  if (!city) return apiError("unknown_city", "Query param `city` is required and must be a known slug", 400);

  const rows = await query(
    `SELECT rank, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng,
            gain, nearest_bin_m, nearby_reports, rationale
       FROM bin_candidates
      WHERE city_id = $1
      ORDER BY rank
      LIMIT 100`,
    [city.id],
  );
  return NextResponse.json({
    recommendations: rows.map((r) => ({
      rank: Number(r.rank),
      lat: Number(r.lat),
      lng: Number(r.lng),
      gain: Number(r.gain),
      nearest_bin_m: Number(r.nearest_bin_m),
      nearby_reports: Number(r.nearby_reports),
      rationale: (r.rationale as string | null) ?? "",
    })),
  });
}
