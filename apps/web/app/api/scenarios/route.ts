import { NextResponse } from "next/server";
import { mocks, useMocks } from "@/lib/mocks";

export async function POST() {
  if (useMocks()) {
    return NextResponse.json(mocks.scenarioCreate, { status: 201 });
  }
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Real scenario branching not implemented yet" } },
    { status: 501 },
  );
}
