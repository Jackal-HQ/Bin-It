// Display text and colors shared by the dashboard. Colors are color-blind safe:
// pins use a warm ramp that also grows in size, hexes a cool ramp, and the
// under-reported layer an outline rather than a fill.
import type { Cell, Status } from "./types";

type RGB = [number, number, number];

const LABEL_TEXT: Record<string, string> = {
  overflowing_can: "Overflowing can",
  bag_pile: "Bag pile",
  illegal_dumping: "Illegal dumping",
  clean: "Clean",
  not_trash: "Not trash",
  unclassified: "Not classified",
};

/** Unknown labels render as "Received" (contract rule). */
export const labelText = (label: string) => LABEL_TEXT[label] ?? "Received";

export const LABEL_OPTIONS = Object.keys(LABEL_TEXT);

const SEVERITY_TEXT = ["Clean", "Low", "Medium", "High"];
export const severityText = (s: number) => SEVERITY_TEXT[s] ?? "Unknown";

export const STATUS_TEXT: Record<Status, string> = {
  received: "Received",
  reviewed: "Reviewed",
  resolved: "Resolved",
};
export const STATUS_OPTIONS = Object.keys(STATUS_TEXT) as Status[];

// severity 0..3: grey, then light orange -> dark red (luminance falls as severity rises)
export const SEVERITY_COLOR: RGB[] = [
  [156, 163, 175],
  [253, 174, 97],
  [244, 109, 67],
  [165, 0, 38],
];
export const severityColor = (s: number): RGB => SEVERITY_COLOR[Math.max(0, Math.min(3, s))];
export const severityRadius = (s: number) => 7 + 2 * Math.max(0, Math.min(3, s));

// risk rank 0..1 (see rankCells) -> light to dark blue
const RISK_STOPS: RGB[] = [
  [239, 243, 255],
  [189, 215, 231],
  [107, 174, 214],
  [49, 130, 189],
  [8, 81, 156],
];
export function riskColor(v: number): RGB {
  const t = Math.max(0, Math.min(1, v)) * (RISK_STOPS.length - 1);
  const i = Math.min(Math.floor(t), RISK_STOPS.length - 2);
  const f = t - i;
  const [a, b] = [RISK_STOPS[i], RISK_STOPS[i + 1]];
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f)) as RGB;
}
export const RISK_GRADIENT = `linear-gradient(to right, ${RISK_STOPS.map((c) => `rgb(${c.join(",")})`).join(", ")})`;

/** A cell plus where its expected_overflow ranks within its city (0 = lowest, 1 = highest). */
export type RankedCell = Cell & { risk_rank: number };

/** expected_overflow is an unbounded model score whose range differs by city (about 0.4 to 7),
 *  so colors and words use the cell's rank within the city instead of the raw value. */
export function rankCells(cells: Cell[]): RankedCell[] {
  const order = cells.map((c, i) => [c.expected_overflow, i] as const).sort((a, b) => a[0] - b[0]);
  const rank = new Array<number>(cells.length);
  order.forEach(([, i], pos) => (rank[i] = cells.length > 1 ? pos / (cells.length - 1) : 0.5));
  return cells.map((c, i) => ({ ...c, risk_rank: rank[i] }));
}

/** Plain-language band for a risk rank. */
export function riskText(rank: number) {
  if (rank >= 0.75) return "High (top 25% of areas in this city)";
  if (rank >= 0.4) return "Medium";
  return "Low (bottom 40% of areas in this city)";
}

export const UNDER_REPORTED_COLOR: RGB = [231, 41, 138];
export const BIN_COLOR: RGB = [55, 65, 81];
export const SITE_COLOR: RGB = [22, 101, 52];

export const rgb = (c: RGB) => `rgb(${c.join(",")})`;

/** "3 min ago", "5 h ago", "2 d ago". */
export function timeAgo(iso: string | undefined) {
  if (!iso) return "-";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(s)) return "-";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const formatDateTime = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "-";

/** Cities with no local complaint data run the cold-start model (hard-coded until /api/cities has a flag). */
export const COLD_START_CITIES = new Set(["orlando"]);
