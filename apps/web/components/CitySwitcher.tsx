"use client";

import { COLD_START_CITIES } from "@/lib/labels";
import type { City } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";

type Props = { cities: City[] | undefined; value: string; onChange: (slug: string) => void };

export default function CitySwitcher({ cities, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="City"
        value={value}
        disabled={!cities}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[8px] border border-rc-border bg-obsidian px-2.5 py-1 text-[13px] font-medium text-white transition-colors hover:border-smoke focus-visible:outline focus-visible:outline-1 focus-visible:outline-mist"
      >
        {(cities ?? [{ slug: value, name: "Loading…" } as City]).map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      {COLD_START_CITIES.has(value) && (
        <Tooltip
          content="No local 311 complaint data: the model was trained on NYC and Chicago and applied here. Lightly validated, so read scores as estimates."
          containerClassName="hidden sm:inline-flex"
        >
          <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.073em] text-ash">
            Cold-start model
          </span>
        </Tooltip>
      )}
    </div>
  );
}
