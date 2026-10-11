// Decorative H3-style hexagon grid. Intensity comes from a deterministic smooth function so
// server and client render the same markup. Illustrative only: it never shows real scores.
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

function hexPath(cx: number, cy: number) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i - 30) * Math.PI) / 180;
    return `${(cx + R * 0.94 * Math.cos(a)).toFixed(1)},${(cy + R * 0.94 * Math.sin(a)).toFixed(1)}`;
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
          return (
            <path
              key={`${c}-${r}`}
              d={hexPath(x, y)}
              fill={`rgba(255,99,99,${(0.06 + 0.62 * v * v).toFixed(3)})`}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.6"
            />
          );
        }),
      )}
      {flags.map(([c, r]) => {
        const { x, y } = center(c, r);
        return (
          <circle
            key={`f-${c}-${r}`}
            cx={x}
            cy={y}
            r={R * 0.95}
            fill="none"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        );
      })}
      {pins.map(([c, r], i) => {
        const { x, y } = center(c, r);
        return (
          <g key={`p-${c}-${r}`}>
            <circle cx={x} cy={y} r={R * 0.62} fill="#040506" stroke="#e6e6e6" strokeWidth="1.2" />
            <text
              x={x}
              y={y + 3.4}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight="600"
              fill="#ffffff"
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
