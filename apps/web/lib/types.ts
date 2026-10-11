export type Label =
  | "overflowing_can"
  | "bag_pile"
  | "illegal_dumping"
  | "clean"
  | "not_trash"
  | "unclassified";

export type Status = "received" | "reviewed" | "resolved";

export type City = {
  slug: string;
  name: string;
  center: { lat: number; lng: number };
  bbox: [number, number, number, number];
};

export type Report = {
  id: string;
  ticket_id: string;
  city: string;
  lat: number;
  lng: number;
  label: Label;
  severity: number;
  note?: string | null;
  photo_url?: string;
  is_synthetic: boolean;
  created_at: string;
  // The owning ticket's status. GET /api/reports/{id} populates it; optional elsewhere.
  status?: Status;
};

export type Ticket = {
  id: string;
  lat: number;
  lng: number;
  label: Label;
  max_severity: number;
  report_count: number;
  status: Status;
  first_seen?: string;
  last_seen?: string;
  // The representative report's photo (most severe, then most recent); null when none.
  // Returned by GET /api/tickets and GET /api/reports/nearby.
  photo_url?: string | null;
  is_synthetic: boolean;
};

export type Bin = {
  id: string;
  lat: number;
  lng: number;
  source: "osm" | "city" | "proposed";
};

export type Cell = {
  h3_cell: string;
  lat: number;
  lng: number;
  expected_overflow: number;
  reports_per_1k: number | null; // null until population/311 data is joined
  under_reported: boolean;
  demand: number;
};

export type Recommendation = {
  rank: number;
  lat: number;
  lng: number;
  gain: number;
  nearest_bin_m: number;
  nearby_reports: number;
  rationale: string;
};

export type Scenario = {
  id: string;
  branch_id: string; // "none" when mode is "calculated"
  mode?: "branch" | "calculated";
  before: { avg_distance_m: number; coverage_150m_pct: number };
  after: { avg_distance_m: number; coverage_150m_pct: number };
};

export type ApiError = { error: { code: string; message: string } };

export type Health = { database: string; classifier: string; use_mocks: boolean };

/** Map bounds as sent in `bbox=`: west, south, east, north. */
export type Bbox = [number, number, number, number];
