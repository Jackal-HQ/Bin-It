import { NextResponse } from "next/server";
import { readMock, useMocks } from "@/lib/mocks";

export async function GET() {
  if (useMocks()) {
    return NextResponse.json(await readMock("recommendations.json"));
  }
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Real recommendations not implemented yet" } },
    { status: 501 },
  );
}
