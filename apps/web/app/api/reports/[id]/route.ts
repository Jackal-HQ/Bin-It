import { NextResponse } from "next/server";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { apiError, query } from "@/lib/server";

export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]">) {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.report);
  }

  const { id } = await ctx.params;

  // geom is geography(Point, 4326); pull lat/lng back out with PostGIS and
  // join cities so we return the city slug the contract expects (not city_id).
  const rows = await query(
    `SELECT r.id,
            r.ticket_id,
            c.slug AS city,
            ST_Y(r.geom::geometry) AS lat,
            ST_X(r.geom::geometry) AS lng,
            r.label,
            r.severity,
            r.note,
            r.photo_url,
            r.is_synthetic,
            r.created_at,
            t.status AS status
       FROM reports r
       JOIN cities c ON c.id = r.city_id
       JOIN tickets t ON t.id = r.ticket_id
      WHERE r.id = $1`,
    [id],
  );

  const r = rows[0];
  if (!r) return apiError("not_found", `No report ${id}`, 404);

  return NextResponse.json({
    report: {
      id: r.id,
      ticket_id: r.ticket_id,
      city: r.city,
      lat: Number(r.lat),
      lng: Number(r.lng),
      label: r.label,
      severity: Number(r.severity),
      note: (r.note as string | null) ?? null,
      photo_url: r.photo_url,
      is_synthetic: Boolean(r.is_synthetic),
      created_at: new Date(r.created_at as string).toISOString(),
      status: r.status,
    },
  });
}
