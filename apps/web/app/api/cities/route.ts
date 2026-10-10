import { NextResponse } from "next/server";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { query } from "@/lib/server";

export async function GET() {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.cities);
  }
  const rows = await query(
    `SELECT slug, name, ST_Y(center::geometry) AS lat, ST_X(center::geometry) AS lng, bbox
       FROM cities ORDER BY name`,
  );
  return NextResponse.json({
    cities: rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      center: { lat: Number(r.lat), lng: Number(r.lng) },
      bbox: (r.bbox as unknown[]).map(Number),
    })),
  });
}
