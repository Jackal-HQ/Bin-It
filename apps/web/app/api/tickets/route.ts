import { NextResponse } from "next/server";
import { readMock, useMocks } from "@/lib/mocks";

export async function GET() {
  if (useMocks()) {
    return NextResponse.json(await readMock("tickets.json"));
  }
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Real tickets queue not implemented yet" } },
    { status: 501 },
  );
}
