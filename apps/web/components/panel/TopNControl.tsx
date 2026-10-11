"use client";

import { Tooltip } from "@/components/ui/tooltip-card";

/** "Top N" slider shared by the Bins and Scenario tabs (5 to 50, capped by the sites available). */
export default function TopNControl({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const min = Math.min(5, max);
  const shown = Math.min(value, max);
  return (
    <label className="flex items-center gap-3 text-sm">
      <Tooltip content="How many of the ranked sites to show on the map and include in a scenario. Sites are ordered by estimated gain.">
        <span className="whitespace-nowrap font-medium text-white">Top sites</span>
      </Tooltip>
      <input
        type="range"
        min={min}
        max={Math.max(max, min)}
        value={shown}
        disabled={disabled || max <= min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 cursor-pointer accent-[var(--color-mist)] disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="min-w-9 rounded-[6px] bg-graphite px-2 py-0.5 text-center font-mono text-xs font-medium tabular-nums text-white">
        {shown}
      </span>
    </label>
  );
}
