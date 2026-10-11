// Daylight primitives shared by the dashboard (.claude/DESIGN.md, "Daylight guide").
// Class constants for the recurring recipes, plus the dot motifs: LED meter, dot bar, dot gauge.
import { rgb, severityColor } from "@/lib/labels";
import { cn } from "@/lib/utils";

// ---- surfaces ----

/** Frosted card: the default container in the side panel. */
export const card = "rounded-card bg-glass shadow-card backdrop-blur-[24px]";
/** Floating surface over the map (legend, menus). */
export const float = "rounded-float bg-glass-strong shadow-float backdrop-blur-[22px] backdrop-saturate-[1.3]";
/** Recessed tile inside a card. */
export const tile = "rounded-tile bg-well px-3.5 py-3";

// ---- type ----

export const eyebrow = "font-mono text-[11px] uppercase tracking-[0.08em] text-quiet";
export const tileLabel = "font-mono text-[10.5px] uppercase tracking-[0.08em] text-quiet";
export const meta = "font-mono text-[11px] text-quiet";

// ---- controls ----

const pillBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
/** The one charcoal action per view. */
export const btnPrimary = cn(
  pillBase,
  "h-12 gap-2.5 bg-charcoal px-5 text-[14px] font-bold text-white shadow-primary hover:bg-charcoal-raised",
);
export const btnSecondary = cn(
  pillBase,
  "h-10 border border-rim bg-white/85 px-4 text-[13.5px] text-strong hover:bg-white",
);
export const btnGhost = cn(pillBase, "h-10 px-3.5 text-[14px] text-soft hover:bg-well");
export const iconBtn = cn(pillBase, "size-11 bg-well text-soft hover:bg-rim");
/** A rounded select; wrap in a `relative` label and add a ChevronIcon. */
export const selectPill =
  "h-9 cursor-pointer appearance-none rounded-full border border-rim bg-white/90 pl-4 pr-9 text-[13px] font-semibold text-strong";
export const inputPill =
  "h-11 min-w-0 rounded-full border border-rim bg-white px-[18px] text-[14px] text-strong placeholder:text-quiet";

/** Pill-shaped segmented group. `track` = recessed well (status), otherwise glass. */
export function Segmented({
  label,
  options,
  value,
  onChange,
  disabled,
  track = false,
}: {
  label: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  track?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex gap-1 rounded-full p-1", track ? "bg-white/75" : "bg-glass shadow-bar backdrop-blur-[20px]")}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={cn(
              "h-10 flex-1 rounded-full px-5 text-[14px] transition-colors disabled:cursor-wait",
              on ? "bg-charcoal font-bold text-white shadow-primary" : "font-semibold text-soft hover:bg-well",
            )}
          >
            {o.name}
          </button>
        );
      })}
    </div>
  );
}

// ---- dot motifs ----

/** Severity as LED dots: `severity` of 3 filled in the map's pin color. Sits beside the word.
 *  `onDark` lifts the darkest red and the empty dots so the meter reads on a dark chip. */
export function Led({ severity, size = 8, onDark = false }: { severity: number; size?: number; onDark?: boolean }) {
  const s = Math.max(0, Math.min(3, severity));
  const on = onDark && s === 3 ? "#FF7A6B" : rgb(severityColor(s));
  const off = onDark ? "rgb(255 255 255 / 0.3)" : "var(--color-led-off)";
  return (
    <span aria-hidden className="inline-flex gap-[3px]">
      {[1, 2, 3].map((i) => (
        <span key={i} className="rounded-full" style={{ width: size, height: size, background: i <= s ? on : off }} />
      ))}
    </span>
  );
}

/** Dot bar: `filled` of `total` dots (8 px pitch). Pair with the number it stands for. */
export function DotBar({ filled, total = 14 }: { filled: number; total?: number }) {
  const n = Math.max(0, Math.min(total, Math.round(filled)));
  return (
    <span aria-hidden className="dot-track relative block h-2" style={{ width: total * 8 }}>
      <span className="dot-fill absolute left-0 top-0 block h-2" style={{ width: n * 8 }} />
    </span>
  );
}

/** Dot gauge: 31 dots over 180 degrees. Charcoal = now, sun = estimated gain, faint = uncovered. */
export function DotGauge({ before, after, label }: { before: number; after: number; label: string }) {
  const count = (pct: number) => (pct <= 0 ? 0 : Math.min(31, Math.round(pct * 0.3) + 1));
  const now = count(Math.min(before, after));
  const total = count(Math.max(before, after));
  const dots = Array.from({ length: 31 }, (_, i) => {
    const theta = ((180 - 6 * i) * Math.PI) / 180;
    return { i, x: 95 + 82 * Math.cos(theta), y: 98 - 82 * Math.sin(theta) };
  });
  return (
    <svg viewBox="0 0 190 112" width="100%" role="img" aria-label={label} className="block">
      {dots.map(({ i, x, y }) => {
        const state = i < now ? "now" : i < total && after > before ? "added" : "off";
        return (
          <circle
            key={i}
            cx={x.toFixed(1)}
            cy={y.toFixed(1)}
            r="3.4"
            fill={state === "now" ? "#2A2926" : state === "added" ? "#F6C944" : "rgb(60 52 28 / 0.17)"}
            stroke={state === "added" ? "#C99410" : undefined}
            strokeWidth={state === "added" ? 0.9 : undefined}
          />
        );
      })}
    </svg>
  );
}
