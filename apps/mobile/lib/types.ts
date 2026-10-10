// Mirrors apps/web/lib/types.ts and docs/api.md. If a response shape changes,
// update docs/api.md, mocks/, apps/web/lib/types.ts, and this file together.

export type Label =
  | "overflowing_can"
  | "bag_pile"
  | "illegal_dumping"
  | "clean"
  | "not_trash"
  | "unclassified";

export type Status = "received" | "reviewed" | "resolved";

export type CitySlug = string;

export type City = {
  slug: CitySlug;
  name: string;
  center: { lat: number; lng: number };
  bbox: [number, number, number, number];
};

export type Report = {
  id: string;
  ticket_id: string;
  city: CitySlug;
  lat: number;
  lng: number;
  label: Label;
  severity: number;
  note?: string | null;
  photo_url?: string;
  is_synthetic: boolean;
  created_at: string;
};

export type Ticket = {
  id: string;
  lat: number;
  lng: number;
  label: Label;
  max_severity: number;
  report_count: number;
  status: Status;
  is_synthetic: boolean;
};

export type Bin = {
  id: string;
  lat: number;
  lng: number;
  source: "osm" | "city" | "proposed";
};

// POST /api/reports -> 201
export type CreateReportResponse = {
  report: Report;
  ticket: {
    id: string;
    status: Status;
    report_count: number;
    max_severity: number;
    merged: boolean;
  };
};

// GET /api/reports/nearby -> 200
export type NearbyResponse = {
  tickets: Ticket[];
  bins: Bin[];
};

export type ApiError = { error: { code: string; message: string } };

// Human-readable fallback for any label, including unknown ones ("received").
export const LABEL_TEXT: Record<string, string> = {
  overflowing_can: "Overflowing can",
  bag_pile: "Bag pile",
  illegal_dumping: "Illegal dumping",
  clean: "Clean",
  not_trash: "Not trash",
  unclassified: "Received",
};

export function labelText(label: string): string {
  // Contract: apps must render unknown labels as "received".
  return LABEL_TEXT[label] ?? "Received";
}
