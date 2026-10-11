"use client";

import Link from "next/link";
import { useState } from "react";
import { cachedMode } from "@/lib/api";
import { setStaffKey, useHealth, useStaffKey } from "@/lib/hooks";
import { LAYER_NAMES, type LayerToggles } from "@/lib/selection";
import type { City } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import CitySwitcher from "./CitySwitcher";

type Props = {
  cities: City[] | undefined;
  city: string;
  onCity: (slug: string) => void;
  layers: LayerToggles;
  onLayers: (l: LayerToggles) => void;
};

const KEY_SHADOW =
  "rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset";

const LAYER_HINTS: Record<keyof LayerToggles, string> = {
  pins: "Resident reports merged into tickets. Size and color grow with severity.",
  risk: "Model estimate of expected overflow per hexagon, ranked within this city.",
  under: "Areas the model expects to be messy that residents report little. Needs reports per 1,000 residents.",
  bins: "Bins already known from OpenStreetMap or the city.",
  sites: "Ranked sites where a new bin would help most. The top N feed the Scenario tab.",
};

export default function TopBar({ cities, city, onCity, layers, onLayers }: Props) {
  return (
    <header className="relative z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rc-border bg-void-black/80 px-4 py-2 backdrop-blur-[48px]">
      <Link href="/" className="flex items-center gap-2">
        <span aria-hidden className="h-3 w-3 rotate-45 rounded-[2px] bg-coral-pulse" />
        <span className="text-[13px] font-medium text-white">Bin-It</span>
        <span className="hidden rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.073em] text-ash sm:inline">
          Staff
        </span>
      </Link>
      <span aria-hidden className="hidden h-5 w-px bg-rc-border sm:block" />
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
      <summary className="cursor-pointer list-none rounded-[8px] border border-rc-border px-2.5 py-1 text-[13px] font-medium text-ash transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
        Layers ▾
      </summary>
      <div
        className="absolute left-0 z-20 mt-1.5 w-60 space-y-0.5 rounded-[12px] bg-ink p-2"
        style={{ boxShadow: KEY_SHADOW }}
      >
        {(Object.keys(LAYER_NAMES) as (keyof LayerToggles)[]).map((k) => (
          <Tooltip key={k} content={LAYER_HINTS[k]} containerClassName="flex w-full">
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2 py-1.5 text-[13px] text-ash transition-colors hover:bg-white/[0.04] hover:text-white">
              <input
                type="checkbox"
                className="accent-[var(--color-mist)]"
                checked={layers[k]}
                onChange={(e) => onLayers({ ...layers, [k]: e.target.checked })}
              />
              {LAYER_NAMES[k]}
            </label>
          </Tooltip>
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
  const chip = "font-mono text-[11px] text-smoke transition-colors hover:text-white";
  if (key) {
    return (
      <Tooltip content="The staff key is kept for this browser session only. Clear it to stop changing ticket status.">
        <button onClick={() => setStaffKey(null)} className={chip}>
          Staff key set · clear
        </button>
      </Tooltip>
    );
  }
  if (!open) {
    return (
      <Tooltip content="Changing a ticket's status needs the staff key. Reading the queue and map does not.">
        <button onClick={() => setOpen(true)} className={chip}>
          Enter staff key
        </button>
      </Tooltip>
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
      className="flex gap-1.5"
    >
      <input
        autoFocus
        type="password"
        aria-label="Staff key"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Staff key"
        className="w-28 rounded-[8px] border border-rc-border bg-obsidian px-2 py-1 text-xs text-white placeholder:text-smoke focus-visible:outline focus-visible:outline-1 focus-visible:outline-mist"
      />
      <button className="rounded-[8px] bg-mist px-2.5 text-xs font-medium text-iron transition-opacity hover:opacity-90">
        Save
      </button>
    </form>
  );
}

function HealthDot() {
  const health = useHealth();
  if (cachedMode) {
    return (
      <Tooltip content="Showing saved responses. Nothing is fetched live and status changes are disabled.">
        <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.073em] text-ash">
          Cached data (offline mode)
        </span>
      </Tooltip>
    );
  }
  const h = health.data;
  const ok = h?.database === "ok" && h?.classifier === "ok";
  const color = health.isError ? "bg-coral-pulse" : !h ? "bg-smoke" : ok ? "bg-success-green" : "bg-amber-400";
  const title = health.isError
    ? `API unreachable: ${health.error.message}`
    : h
      ? `Database: ${h.database} · Classifier: ${h.classifier}${h.use_mocks ? " · serving mock data" : ""}`
      : "Checking…";
  return (
    <span className="flex items-center gap-2">
      {h?.use_mocks && (
        <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.073em] text-ash">
          Mock API data
        </span>
      )}
      <Tooltip content={title}>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-smoke" aria-label={title} tabIndex={0}>
          <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
          {health.isError ? "Offline" : !h ? "Checking" : ok ? "Live" : "Degraded"}
        </span>
      </Tooltip>
    </span>
  );
}
