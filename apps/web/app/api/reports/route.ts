import { NextResponse } from "next/server";
import { mocks, useMocks } from "@/lib/mocks";

export async function POST() {
  if (useMocks()) {
    return NextResponse.json(mocks.reportsCreate, { status: 201 });
  }
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Real report ingestion not implemented yet" } },
    { status: 501 },
  );
}
