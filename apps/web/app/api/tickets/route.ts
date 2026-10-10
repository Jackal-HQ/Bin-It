import { NextResponse } from "next/server";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { TICKET_SYNTHETIC, apiError, findCity, query, ticketJson } from "@/lib/server";

const STATUSES = ["received", "reviewed", "resolved"];

export async function GET(request: Request) {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.tickets);
  }
  const params = new URL(request.url).searchParams;
  const city = await findCity(params.get("city"));
  if (!city) return apiError("unknown_city", "Query param `city` is required and must be a known slug", 400);

  const status = params.get("status");
  if (status && !STATUSES.includes(status)) {
    return apiError("invalid_status", `status must be one of ${STATUSES.join(", ")}`, 400);
  }
  const label = params.get("label");

  const rows = await query(
    `SELECT t.id, ST_Y(t.centroid::geometry) AS lat, ST_X(t.centroid::geometry) AS lng,
            t.label, t.max_severity, t.report_count, t.status, t.first_seen, t.last_seen,
            ${TICKET_SYNTHETIC} AS is_synthetic
       FROM tickets t
      WHERE t.city_id = $1
        AND ($2::text IS NULL OR t.status = $2)
        AND ($3::text IS NULL OR t.label = $3)
      ORDER BY t.max_severity DESC, t.report_count DESC, t.last_seen DESC
      LIMIT 500`,
    [city.id, status, label],
  );
  return NextResponse.json({ tickets: rows.map((r) => ticketJson(r, true)) });
}
