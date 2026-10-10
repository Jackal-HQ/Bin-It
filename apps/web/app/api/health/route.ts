import { NextResponse } from "next/server";
import { mocks, mocksEnabled } from "@/lib/mocks";
import { query } from "@/lib/server";

async function databaseStatus() {
  try {
    await query("SELECT 1");
    return "ok";
  } catch {
    return "error";
  }
}

async function classifierStatus() {
  if (!process.env.CLASSIFIER_URL) return "error";
  try {
    const res = await fetch(`${process.env.CLASSIFIER_URL}/health`, {
      headers: { "ngrok-skip-browser-warning": "1" },
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

export async function GET() {
  if (mocksEnabled()) {
    return NextResponse.json(mocks.health);
  }
  const [database, classifier] = await Promise.all([databaseStatus(), classifierStatus()]);
  return NextResponse.json({ database, classifier, use_mocks: false });
}
