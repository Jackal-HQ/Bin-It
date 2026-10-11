"use client";

import { COLD_START_CITIES } from "@/lib/labels";
import type { City } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import { ChevronIcon } from "@/components/dash/icons";
import { selectPill } from "@/components/dash/ui";

type Props = { cities: City[] | undefined; value: string; onChange: (slug: string) => void };

// Up to this many cities show as a pill group; more become a select pill.
const MAX_PILLS = 4;

const shortName = (c: City) => c.name.split(",")[0];

export default function CitySwitcher({ cities, value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!cities ? (
        <div aria-label="Loading cities" className="h-12 w-72 animate-pulse rounded-full bg-glass" />
      ) : cities.length <= MAX_PILLS ? (
        <div
          role="group"
          aria-label="City"
          className="flex h-12 items-center gap-1 rounded-full bg-glass p-1 shadow-bar backdrop-blur-[20px]"
        >
          {cities.map((c) => {
            const on = c.slug === value;
            return (
              <button
                key={c.slug}
                aria-pressed={on}
                onClick={() => onChange(c.slug)}
                className={`h-10 rounded-full px-3 text-[14px] transition-colors sm:px-5 ${
                  on ? "bg-charcoal font-bold text-white shadow-primary" : "font-semibold text-soft hover:bg-well"
                }`}
              >
                {shortName(c)}
              </button>
            );
          })}
        </div>
      ) : (
        <label className="relative inline-flex items-center">
          <select aria-label="City" value={value} onChange={(e) => onChange(e.target.value)} className={`${selectPill} h-12 bg-glass`}>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronIcon size={14} className="pointer-events-none absolute right-3.5 text-soft" />
        </label>
      )}
      {COLD_START_CITIES.has(value) && (
        <Tooltip
          content="No local 311 complaint data: the model was trained on NYC and Chicago and applied here. Lightly validated, so read scores as estimates."
          containerClassName="hidden sm:inline-flex"
        >
          <span className="inline-flex h-[30px] items-center gap-2 rounded-full border-[1.5px] border-dashed border-quiet/45 px-3 font-mono text-[10.5px] uppercase tracking-[0.07em] text-soft">
            <span className="size-[7px] rounded-full bg-sun" />
            Cold-start model
          </span>
        </Tooltip>
      )}
    </div>
  );
}
