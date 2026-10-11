import { NextResponse } from "next/server";
import { mocksEnabled } from "@/lib/mocks";
import { deleteBranch } from "@/lib/scenarios";
import { apiError } from "@/lib/server";

// Ids are `s_<neon branch id>` for branch scenarios (the branch is deleted here) or
// `s_calc_...` for calculated ones (nothing to delete). Deleting is idempotent.
export async function DELETE(_request: Request, ctx: RouteContext<"/api/scenarios/[id]">) {
  if (mocksEnabled()) {
    return new NextResponse(null, { status: 204 });
  }
  const { id } = await ctx.params;
  if (id.startsWith("s_calc_")) return new NextResponse(null, { status: 204 });

  const match = /^s_(br-[a-z0-9-]+)$/.exec(id);
  if (!match) return apiError("invalid_id", "Unknown scenario id", 400);

  try {
    await deleteBranch(match[1]);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("scenario delete failed:", e);
    return apiError("delete_failed", "Could not delete the scenario branch", 502);
  }
}
