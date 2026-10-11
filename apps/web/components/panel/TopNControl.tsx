"use client";

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
      <span className="whitespace-nowrap font-medium">Top {shown} sites</span>
      <input
        type="range"
        min={min}
        max={Math.max(max, min)}
        value={shown}
        disabled={disabled || max <= min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--brand)]"
      />
    </label>
  );
}
