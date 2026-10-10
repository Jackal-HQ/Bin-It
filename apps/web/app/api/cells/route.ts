import { NextResponse } from "next/server";
import { mocks, useMocks } from "@/lib/mocks";

export async function GET() {
  if (useMocks()) {
    return NextResponse.json(mocks.cells);
  }
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Real cell scores not implemented yet" } },
    { status: 501 },
  );
}
