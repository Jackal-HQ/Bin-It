import { NextResponse } from "next/server";
import { z } from "zod";
import { mocks, mocksEnabled } from "@/lib/mocks";
import {
  apiError,
  classify,
  findCity,
  newId,
  query,
  toVector,
  uploadPhoto,
} from "@/lib/server";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const DUPLICATE_RADIUS_M = 50;
const DUPLICATE_DAYS = 7;
const DUPLICATE_MIN_SIMILARITY = 0.85; // cosine; tune on our photos

const fields = z.object({
  city: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.reportsCreate, { status: 201 });
  }

  // 1. validate
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("bad_request", "Expected multipart/form-data", 400);
  }
  const parsed = fields.safeParse({
    city: form.get("city"),
    lat: form.get("lat"),
    lng: form.get("lng"),
    note: form.get("note") || undefined,
  });
  if (!parsed.success) {
    return apiError("invalid_fields", parsed.error.issues[0]?.message ?? "Invalid fields", 400);
  }
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return apiError("missing_photo", "Field `photo` (JPEG file) is required", 400);
  }
  if (photo.type !== "image/jpeg") {
    return apiError("invalid_photo", "Photo must be a JPEG", 400);
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return apiError("photo_too_large", "Photo must be 5 MB or smaller", 413);
  }
  const { city, lat, lng, note } = parsed.data;
  const cityRow = await findCity(city);
  if (!cityRow) return apiError("unknown_city", `Unknown city: ${city}`, 400);
  const deviceId = request.headers.get("x-device-id") || "anonymous";

  // 2. upload photo
  const reportId = newId("r");
  let photoUrl: string;
  try {
    photoUrl = await uploadPhoto(`reports/${reportId}.jpg`, new Uint8Array(await photo.arrayBuffer()));
  } catch {
    return apiError("storage_error", "Could not store the photo", 502);
  }

  // 3. classify (falls back to unclassified / severity 1 after ~10 s)
  const result = await classify(photo, `${reportId}.jpg`);
  const vector = result.embedding ? toVector(result.embedding) : null;

  // 4. duplicate query: same city, within 50 m, last 7 days, similar photo, ticket still open
  let ticketId: string | null = null;
  if (vector) {
    const dup = await query(
      `SELECT r.ticket_id
         FROM reports r JOIN tickets t ON t.id = r.ticket_id
        WHERE r.city_id = $1
          AND t.status <> 'resolved'
          AND r.created_at > now() - make_interval(days => $5::int)
          AND ST_DWithin(r.geom, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $6::float8)
          AND 1 - (r.embedding <=> $4::vector) >= $7::float8
        ORDER BY r.embedding <=> $4::vector
        LIMIT 1`,
      [cityRow.id, lat, lng, vector, DUPLICATE_DAYS, DUPLICATE_RADIUS_M, DUPLICATE_MIN_SIMILARITY],
    );
    if (dup[0]) ticketId = dup[0].ticket_id as string;
  }

  // 5. attach to the ticket, or create one
  const merged = ticketId !== null;
  if (!ticketId) {
    ticketId = newId("t");
    await query(
      `INSERT INTO tickets (id, city_id, centroid, label, max_severity, report_count)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, $6, 0)`,
      [ticketId, cityRow.id, lat, lng, result.label, result.severity],
    );
  }
  const inserted = await query(
    `INSERT INTO reports (id, city_id, ticket_id, geom, photo_url, note, label, severity,
                          embedding, device_id, is_synthetic)
     VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography, $6, $7, $8, $9,
             $10::vector, $11, false)
     RETURNING created_at`,
    [reportId, cityRow.id, ticketId, lat, lng, photoUrl, note ?? null, result.label,
     result.severity, vector, deviceId],
  );
  const ticket = await query(
    `UPDATE tickets
        SET report_count = report_count + 1,
            max_severity = GREATEST(max_severity, $2),
            last_seen = now()
      WHERE id = $1
      RETURNING id, status, report_count, max_severity`,
    [ticketId, result.severity],
  );

  // 6. respond per contract
  return NextResponse.json(
    {
      report: {
        id: reportId,
        ticket_id: ticketId,
        city: cityRow.slug,
        lat,
        lng,
        label: result.label,
        severity: result.severity,
        is_synthetic: false,
        created_at: new Date(inserted[0].created_at as string).toISOString(),
      },
      ticket: {
        id: ticketId,
        status: ticket[0].status,
        report_count: Number(ticket[0].report_count),
        max_severity: Number(ticket[0].max_severity),
        merged,
      },
    },
    { status: 201 },
  );
}
