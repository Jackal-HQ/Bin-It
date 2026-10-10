import { NextResponse } from "next/server";
import { readMock, useMocks } from "@/lib/mocks";

export async function PATCH() {
  if (useMocks()) {
    return NextResponse.json(await readMock("ticket-patch.json"));
  }
  return NextResponse.json(
    { error: { code: "not_implemented", message: "Real ticket status change not implemented yet" } },
    { status: 501 },
  );
}
