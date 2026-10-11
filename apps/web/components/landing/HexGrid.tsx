// Decorative H3-style hexagon grid in the dashboard map's own colors: the blue risk ramp for
// expected overflow, pink dashed rings for under-reported cells, white discs with a green ring
// for ranked sites. Intensity comes from a deterministic smooth function so server and client
// render the same markup. Illustrative only: it never shows real scores.
import { riskColor, rgb } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Cell = [col: number, row: number];

type Props = {
  cols?: number;
  rows?: number;
  seed?: number;
  /** Crop to fill the box instead of letterboxing (for wide, short thumbnails). */
  cover?: boolean;
  /** Numbered markers on cells (ranked sites). */
  pins?: Cell[];
  /** Dashed rings on cells (under-reported areas). */
  flags?: Cell[];
  className?: string;
};

const R = 14; // hex radius in viewBox units
const W = Math.sqrt(3) * R;
const SITE_GREEN = "#166534";
const UNDER_PINK = "#E7298A";

function hexPath(cx: number, cy: number) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 30) * Math.PI) / 180;
    return `${(cx + R * 0.98 * Math.cos(a)).toFixed(1)},${(cy + R * 0.98 * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join("L")}Z`;
}

function intensity(c: number, r: number, seed: number) {
  const a = Math.sin(c * 0.55 + seed) * Math.cos(r * 0.8 + seed * 1.7);
  const b = Math.sin((c + r) * 0.33 + seed * 2.3);
  const v = 0.5 + 0.32 * a + 0.28 * b;
  return Math.min(1, Math.max(0, v));
}

export function HexGrid({ cols = 14, rows = 8, seed = 1, cover = false, pins = [], flags = [], className }: Props) {
  const width = cols * W + W / 2;
  const height = rows * R * 1.5 + R * 0.5;
  const center = (c: number, r: number) => ({
    x: c * W + (r % 2 ? W : W / 2),
    y: r * R * 1.5 + R,
  });

  return (
    <svg
      viewBox={`0 0 ${width.toFixed(0)} ${height.toFixed(0)}`}
      preserveAspectRatio={cover ? "xMidYMid slice" : "xMidYMid meet"}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label="Illustrative hexagon grid of expected overflow"
    >
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const { x, y } = center(c, r);
          const v = intensity(c, r, seed);
          return <path key={`${c}-${r}`} d={hexPath(x, y)} fill={rgb(riskColor(v))} fillOpacity="0.62" />;
        }),
      )}
      {flags.map(([c, r]) => {
        const { x, y } = center(c, r);
        return (
          <path
            key={`f-${c}-${r}`}
            d={hexPath(x, y)}
            fill="none"
            stroke={UNDER_PINK}
            strokeWidth="1.7"
            strokeLinejoin="round"
            strokeDasharray="3.5 2.5"
          />
        );
      })}
      {pins.map(([c, r], i) => {
        const { x, y } = center(c, r);
        return (
          <g key={`p-${c}-${r}`}>
            <circle cx={x} cy={y} r={R * 0.66} fill="#ffffff" stroke={SITE_GREEN} strokeWidth="1.6" />
            <text
              x={x}
              y={y + 3.4}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="600"
              fill={SITE_GREEN}
              fontFamily="var(--font-geist-mono), monospace"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
