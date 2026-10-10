// Server-only helpers shared by the real route handlers. Never import from client code:
// this file reads secrets (DATABASE_URL, storage keys, classifier key).
import { neon } from "@neondatabase/serverless";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

export type Row = Record<string, unknown>;

let sqlClient: ReturnType<typeof neon> | undefined;

/** Parameterised query over Neon's HTTP driver. Use $1, $2 ... placeholders. */
export async function query(text: string, params: unknown[] = []): Promise<Row[]> {
  sqlClient ??= neon(process.env.DATABASE_URL!);
  return (await sqlClient.query(text, params)) as Row[];
}

export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function findCity(slug: string | null | undefined) {
  if (!slug) return null;
  const rows = await query("SELECT id, slug FROM cities WHERE slug = $1", [slug]);
  return rows[0] ? { id: rows[0].id as number, slug: rows[0].slug as string } : null;
}

/** SQL fragment: a ticket is synthetic when all its reports are (bool_and). */
export const TICKET_SYNTHETIC =
  "COALESCE((SELECT bool_and(r.is_synthetic) FROM reports r WHERE r.ticket_id = t.id), false)";

export function ticketJson(r: Row, withTimes: boolean) {
  const t: Record<string, unknown> = {
    id: r.id,
    lat: Number(r.lat),
    lng: Number(r.lng),
    label: r.label,
    max_severity: Number(r.max_severity),
    report_count: Number(r.report_count),
    status: r.status,
  };
  if (withTimes) {
    t.first_seen = new Date(r.first_seen as string).toISOString();
    t.last_seen = new Date(r.last_seen as string).toISOString();
  }
  t.is_synthetic = Boolean(r.is_synthetic);
  return t;
}

// ---- photo storage (Neon Object Storage, S3-compatible) ----

let s3: S3Client | undefined;

export async function uploadPhoto(key: string, body: Uint8Array) {
  s3 ??= new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
  });
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: key,
      Body: body,
      ContentType: "image/jpeg",
    }),
  );
  return `${process.env.PHOTO_BASE_URL}/${key}`;
}

// ---- classifier ----

export type Classification = {
  label: string;
  severity: number;
  embedding: number[] | null;
};

const CLASSIFIER_TIMEOUT_MS = 10_000;

/** Returns the classifier's answer, or the contract's fallback (unclassified, severity 1). */
export async function classify(photo: Blob, filename: string): Promise<Classification> {
  const fallback: Classification = { label: "unclassified", severity: 1, embedding: null };
  if (!process.env.CLASSIFIER_URL) return fallback;
  try {
    const form = new FormData();
    form.append("photo", photo, filename);
    const res = await fetch(`${process.env.CLASSIFIER_URL}/classify`, {
      method: "POST",
      body: form,
      headers: {
        "X-Classifier-Key": process.env.CLASSIFIER_KEY ?? "",
        "ngrok-skip-browser-warning": "1",
      },
      signal: AbortSignal.timeout(CLASSIFIER_TIMEOUT_MS),
    });
    if (!res.ok) return fallback;
    const out = await res.json();
    return {
      label: String(out.label),
      severity: Math.min(3, Math.max(0, Math.round(Number(out.severity)))),
      embedding: Array.isArray(out.embedding) ? out.embedding : null,
    };
  } catch {
    return fallback;
  }
}

export function toVector(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}
