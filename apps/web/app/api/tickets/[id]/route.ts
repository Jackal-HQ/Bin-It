import { NextResponse } from "next/server";
import { z } from "zod";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { apiError, query } from "@/lib/server";

const body = z.object({ status: z.enum(["received", "reviewed", "resolved"]) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/tickets/[id]">) {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.ticketPatch);
  }
  // Demo-grade staff protection; fail closed when STAFF_KEY is not configured.
  const staffKey = process.env.STAFF_KEY;
  if (!staffKey || request.headers.get("x-staff-key") !== staffKey) {
    return apiError("unauthorized", "Missing or invalid X-Staff-Key", 401);
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("invalid_status", "Body must be {\"status\": \"received|reviewed|resolved\"}", 400);
  }
  const { id } = await ctx.params;
  const rows = await query(
    "UPDATE tickets SET status = $2 WHERE id = $1 RETURNING id, status",
    [id, parsed.data.status],
  );
  if (!rows[0]) return apiError("not_found", `No ticket ${id}`, 404);
  return NextResponse.json({ ticket: { id: rows[0].id, status: rows[0].status } });
}
