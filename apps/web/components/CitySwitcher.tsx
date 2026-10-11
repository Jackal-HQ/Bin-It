"use client";

import { COLD_START_CITIES } from "@/lib/labels";
import type { City } from "@/lib/types";

type Props = { cities: City[] | undefined; value: string; onChange: (slug: string) => void };

export default function CitySwitcher({ cities, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="City"
        value={value}
        disabled={!cities}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-medium dark:border-zinc-700 dark:bg-zinc-900"
      >
        {(cities ?? [{ slug: value, name: "Loading…" } as City]).map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      {COLD_START_CITIES.has(value) && (
        <span
          className="hidden rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-900 sm:inline dark:bg-sky-950 dark:text-sky-200"
          title="No local 311 complaint data: the model was trained on NYC and Chicago and applied here. Lightly validated."
        >
          Cold-start model
        </span>
      )}
    </div>
  );
}
