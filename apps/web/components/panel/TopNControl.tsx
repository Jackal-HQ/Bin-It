"use client";

import type { CSSProperties } from "react";
import { Tooltip } from "@/components/ui/tooltip-card";
import { eyebrow } from "@/components/dash/ui";

/** "Top N" control shared by the Bins and Scenario tabs (5 to 50, capped by the sites available).
 *  Renders the inside of a card: eyebrow, caption, dot-matrix value and the slider. */
export default function TopNControl({
  value,
  max,
  onChange,
  disabled,
  caption,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  caption: string;
}) {
  const min = Math.min(5, max);
  const top = Math.max(max, min);
  const shown = Math.min(value, max);
  const pct = top > min ? ((shown - min) / (top - min)) * 100 : 100;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Tooltip content="How many of the ranked sites to show on the map and include in a scenario. Sites are ordered by estimated gain.">
            <span className={eyebrow}>Top sites</span>
          </Tooltip>
          <p className="mt-1.5 max-w-[290px] text-[13px] leading-[1.5] text-soft">{caption}</p>
        </div>
        <span className={`dot-num flex-none text-[46px] ${disabled ? "opacity-45" : ""}`}>{shown}</span>
      </div>
      <input
        type="range"
        aria-label="Top sites"
        min={min}
        max={top}
        value={shown}
        disabled={disabled || max <= min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="dl-range mt-3"
        style={{ "--p": `${pct}%` } as CSSProperties}
      />
      <div className="mt-0.5 flex justify-between font-mono text-[11px] text-quiet">
        <span>{min}</span>
        <span>{top}</span>
      </div>
    </div>
  );
}
