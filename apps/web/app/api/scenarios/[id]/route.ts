import { NextResponse } from "next/server";
import { mocksEnabled } from "@/lib/mocks";

export async function DELETE() {
  if (mocksEnabled()) {
    return new NextResponse(null, { status: 204 });
  }
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Real scenario branch deletion not implemented yet" } },
    { status: 501 },
  );
}
