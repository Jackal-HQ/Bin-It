// The only module that talks to the network. Clients only ever talk to the API
// (never the DB, storage, classifier, or Databricks directly). Every request is
// prefixed with EXPO_PUBLIC_API_BASE and carries the anonymous X-Device-Id.
import { File } from "expo-file-system";
import { getDeviceId } from "@/lib/device";
import type {
  ApiError,
  City,
  CreateReportResponse,
  NearbyResponse,
  Report,
} from "@/lib/types";

const BASE = process.env.EXPO_PUBLIC_API_BASE;

function requireBase(): string {
  if (!BASE) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE is not set. Copy .env.local.example to .env.local and set it to the API URL.",
    );
  }
  return BASE.replace(/\/$/, "");
}

export class ApiRequestError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let code = "http_error";
  let message = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as Partial<ApiError>;
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
    }
  } catch {
    // non-JSON error body; keep defaults
  }
  throw new ApiRequestError(code, message, res.status);
}

async function headers(extra?: Record<string, string>): Promise<Record<string, string>> {
  return {
    "X-Device-Id": await getDeviceId(),
    // Skip the ngrok browser interstitial if the API base is a quick tunnel.
    "ngrok-skip-browser-warning": "1",
    ...extra,
  };
}

// GET /api/cities
export async function getCities(): Promise<City[]> {
  const res = await fetch(`${requireBase()}/api/cities`, { headers: await headers() });
  if (!res.ok) return parseError(res);
  const body = (await res.json()) as { cities: City[] };
  return body.cities;
}

// GET /api/reports/nearby?city=&lat=&lng=&radius_m=
export async function getNearby(params: {
  city: string;
  lat: number;
  lng: number;
  radiusM?: number;
}): Promise<NearbyResponse> {
  const q = new URLSearchParams({
    city: params.city,
    lat: String(params.lat),
    lng: String(params.lng),
    radius_m: String(params.radiusM ?? 1500),
  });
  const res = await fetch(`${requireBase()}/api/reports/nearby?${q}`, {
    headers: await headers(),
  });
  if (!res.ok) return parseError(res);
  return (await res.json()) as NearbyResponse;
}

// GET /api/reports/{id}
export async function getReport(id: string): Promise<Report> {
  const res = await fetch(`${requireBase()}/api/reports/${encodeURIComponent(id)}`, {
    headers: await headers(),
  });
  if (!res.ok) return parseError(res);
  const body = (await res.json()) as { report: Report };
  return body.report;
}

// POST /api/reports (multipart: city, lat, lng, note?, photo)
export async function createReport(params: {
  city: string;
  lat: number;
  lng: number;
  note?: string;
  photoUri: string;
}): Promise<CreateReportResponse> {
  const form = new FormData();
  form.append("city", params.city);
  form.append("lat", String(params.lat));
  form.append("lng", String(params.lng));
  if (params.note) form.append("note", params.note);
  // Since SDK 57 the global fetch is Expo's, which rejects React Native's { uri, name, type }
  // file parts. It accepts any part that has bytes(), so read the file with expo-file-system
  // and state the filename and MIME type explicitly (the API requires image/jpeg).
  const file = new File(params.photoUri);
  form.append("photo", {
    name: "report.jpg",
    type: "image/jpeg",
    bytes: () => file.bytes(),
  } as unknown as Blob);

  const res = await fetch(`${requireBase()}/api/reports`, {
    method: "POST",
    // Do NOT set Content-Type; fetch sets the multipart boundary itself.
    headers: await headers(),
    body: form,
  });
  if (!res.ok) return parseError(res);
  return (await res.json()) as CreateReportResponse;
}
