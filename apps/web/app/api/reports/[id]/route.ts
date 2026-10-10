import { NextResponse } from "next/server";
import { mocks, mocksEnabled } from "@/lib/mocks";

export async function GET() {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.report);
  }
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Real report lookup not implemented yet" } },
    { status: 501 },
  );
}
