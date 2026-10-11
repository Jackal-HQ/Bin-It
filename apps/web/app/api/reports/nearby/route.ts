import { NextResponse } from "next/server";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { TICKET_SYNTHETIC, apiError, findCity, query, ticketJson } from "@/lib/server";

const DEFAULT_RADIUS_M = 500;
const MAX_RADIUS_M = 5000;
const LIMIT = 200;

function num(v: string | null) {
  return v === null || v.trim() === "" ? NaN : Number(v);
}

export async function GET(request: Request) {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.reportsNearby);
  }
  const params = new URL(request.url).searchParams;
  const city = await findCity(params.get("city"));
  if (!city) return apiError("unknown_city", "Query param `city` is required and must be a known slug", 400);

  // Area filter: either bbox=west,south,east,north or lat+lng(+radius_m).
  let ticketArea: string;
  let binArea: string;
  let areaParams: number[];
  const bboxRaw = params.get("bbox");
  if (bboxRaw) {
    const b = bboxRaw.split(",").map(Number);
    if (b.length !== 4 || b.some((n) => !Number.isFinite(n))) {
      return apiError("invalid_bbox", "bbox must be west,south,east,north", 400);
    }
    areaParams = b;
    ticketArea = "ST_Intersects(t.centroid::geometry, ST_MakeEnvelope($2, $3, $4, $5, 4326))";
    binArea = "ST_Intersects(b.geom::geometry, ST_MakeEnvelope($2, $3, $4, $5, 4326))";
  } else {
    const lat = num(params.get("lat"));
    const lng = num(params.get("lng"));
    const radius = params.get("radius_m") === null ? DEFAULT_RADIUS_M : num(params.get("radius_m"));
    if (![lat, lng, radius].every(Number.isFinite) || radius <= 0) {
      return apiError("invalid_area", "Provide bbox, or lat and lng (and optional radius_m)", 400);
    }
    areaParams = [lng, lat, Math.min(radius, MAX_RADIUS_M)];
    ticketArea = "ST_DWithin(t.centroid, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)";
    binArea = "ST_DWithin(b.geom, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4)";
  }

  const [tickets, bins] = await Promise.all([
    query(
      // resolved tickets are no longer a problem on the map.
      // photo_url: the photo of the most severe (then most recent) report on the
      // ticket, so the client can show a thumbnail without another request.
      `SELECT t.id, ST_Y(t.centroid::geometry) AS lat, ST_X(t.centroid::geometry) AS lng,
              t.label, t.max_severity, t.report_count, t.status,
              ${TICKET_SYNTHETIC} AS is_synthetic,
              (SELECT r.photo_url
                 FROM reports r
                WHERE r.ticket_id = t.id AND r.photo_url IS NOT NULL
                ORDER BY r.severity DESC, r.created_at DESC
                LIMIT 1) AS photo_url
         FROM tickets t
        WHERE t.city_id = $1 AND t.status <> 'resolved' AND ${ticketArea}
        ORDER BY t.max_severity DESC, t.report_count DESC
        LIMIT ${LIMIT}`,
      [city.id, ...areaParams],
    ),
    query(
      `SELECT b.id, ST_Y(b.geom::geometry) AS lat, ST_X(b.geom::geometry) AS lng, b.source
         FROM bins b
        WHERE b.city_id = $1 AND b.source <> 'proposed' AND ${binArea}
        LIMIT ${LIMIT}`,
      [city.id, ...areaParams],
    ),
  ]);

  return NextResponse.json({
    tickets: tickets.map((r) => ({
      ...ticketJson(r, false),
      photo_url: (r.photo_url as string | null) ?? null,
    })),
    bins: bins.map((r) => ({
      id: `b_${r.id}`,
      lat: Number(r.lat),
      lng: Number(r.lng),
      source: r.source,
    })),
  });
}
