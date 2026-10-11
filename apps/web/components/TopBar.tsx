"use client";

import Link from "next/link";
import { useState } from "react";
import { cachedMode } from "@/lib/api";
import { setStaffKey, useHealth, useStaffKey } from "@/lib/hooks";
import { LAYER_NAMES, type LayerToggles } from "@/lib/selection";
import type { City } from "@/lib/types";
import CitySwitcher from "./CitySwitcher";

type Props = {
  cities: City[] | undefined;
  city: string;
  onCity: (slug: string) => void;
  layers: LayerToggles;
  onLayers: (l: LayerToggles) => void;
};

export default function TopBar({ cities, city, onCity, layers, onLayers }: Props) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-rc-border dark:bg-ink/90">
      <Link href="/" className="flex items-center gap-2">
        <span aria-hidden className="h-3.5 w-3.5 rotate-45 rounded-[3px] bg-brand" />
        <span className="font-semibold tracking-tight">Bin-It</span>
      </Link>
      <CitySwitcher cities={cities} value={city} onChange={onCity} />
      <LayerMenu layers={layers} onLayers={onLayers} />
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <StaffKeyChip />
        <HealthDot />
      </div>
    </header>
  );
}

function LayerMenu({ layers, onLayers }: { layers: LayerToggles; onLayers: (l: LayerToggles) => void }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-md border border-zinc-300 px-2 py-1 text-sm transition-colors hover:border-zinc-400 dark:border-rc-border dark:hover:border-smoke">
        Layers ▾
      </summary>
      <div className="absolute left-0 z-20 mt-1 w-52 space-y-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-lg dark:border-rc-border dark:bg-ink">
        {(Object.keys(LAYER_NAMES) as (keyof LayerToggles)[]).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.04]">
            <input type="checkbox" className="accent-[var(--brand)]" checked={layers[k]} onChange={(e) => onLayers({ ...layers, [k]: e.target.checked })} />
            {LAYER_NAMES[k]}
          </label>
        ))}
      </div>
    </details>
  );
}

function StaffKeyChip() {
  const key = useStaffKey();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  if (cachedMode) return null;
  if (key) {
    return (
      <button onClick={() => setStaffKey(null)} title="Forget the staff key for this session" className="text-xs text-zinc-500 hover:underline">
        Staff key set · clear
      </button>
    );
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-zinc-500 hover:underline">
        Enter staff key
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim()) setStaffKey(draft.trim());
        setDraft("");
        setOpen(false);
      }}
      className="flex gap-1"
    >
      <input
        autoFocus
        type="password"
        aria-label="Staff key"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Staff key"
        className="w-28 rounded-md border border-zinc-300 px-2 py-0.5 text-xs dark:border-rc-border dark:bg-obsidian"
      />
      <button className="rounded-md bg-brand px-2 text-xs font-medium text-brand-fg transition-opacity hover:opacity-90">Save</button>
    </form>
  );
}

function HealthDot() {
  const health = useHealth();
  if (cachedMode) {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Cached data (offline mode)</span>;
  }
  const h = health.data;
  const ok = h?.database === "ok" && h?.classifier === "ok";
  const color = health.isError ? "bg-red-500" : !h ? "bg-zinc-300" : ok ? "bg-green-500" : "bg-amber-500";
  const title = health.isError
    ? `API unreachable: ${health.error.message}`
    : h
      ? `Database: ${h.database} · Classifier: ${h.classifier}${h.use_mocks ? " · serving mock data" : ""}`
      : "Checking…";
  return (
    <span className="flex items-center gap-2 text-xs text-zinc-500" title={title}>
      {h?.use_mocks && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">Mock API data</span>}
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-label={title} />
    </span>
  );
}
