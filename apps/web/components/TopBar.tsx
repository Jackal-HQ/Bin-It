"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cachedMode } from "@/lib/api";
import { setStaffKey, useHealth, useStaffKey } from "@/lib/hooks";
import { BIN_COLOR, RISK_GRADIENT, SEVERITY_COLOR, SITE_COLOR, rgb } from "@/lib/labels";
import { LAYER_NAMES, type LayerToggles } from "@/lib/selection";
import type { City } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import { cn } from "@/lib/utils";
import { ChevronIcon, CloseIcon, HexMark, HexOutline, KeyIcon, LayersIcon } from "@/components/dash/icons";
import { btnPrimary, inputPill } from "@/components/dash/ui";
import CitySwitcher from "./CitySwitcher";

type Props = {
  cities: City[] | undefined;
  city: string;
  onCity: (slug: string) => void;
  layers: LayerToggles;
  onLayers: (l: LayerToggles) => void;
};

const LAYER_HINTS: Record<keyof LayerToggles, string> = {
  pins: "Resident reports merged into tickets. Size and color grow with severity.",
  risk: "Model estimate of expected overflow per hexagon, ranked within this city.",
  under: "Areas the model expects to be messy that residents report little. Needs reports per 1,000 residents.",
  bins: "Bins already known from OpenStreetMap or the city.",
  sites: "Ranked sites where a new bin would help most. The top N feed the Scenario tab.",
};

/** A small picture of each layer, in the map's own colors, at the right of its menu row. */
const LAYER_SWATCH: Record<keyof LayerToggles, React.ReactNode> = {
  pins: (
    <span className="inline-flex items-center gap-[3px]">
      {[1, 2, 3].map((s) => (
        <span
          key={s}
          className="rounded-full"
          style={{ background: rgb(SEVERITY_COLOR[s]), width: 5 + 3 * s, height: 5 + 3 * s }}
        />
      ))}
    </span>
  ),
  risk: <span className="h-2 w-[34px] rounded-full" style={{ background: RISK_GRADIENT }} />,
  under: <HexOutline size={16} />,
  bins: (
    <span
      className="size-2.5 rounded-full border-[1.5px] border-white shadow-[0_0_0_1px_rgb(60_52_28/0.18)]"
      style={{ background: rgb(BIN_COLOR) }}
    />
  ),
  sites: (
    <span
      className="inline-flex size-5 items-center justify-center rounded-full border-2 bg-white font-mono text-[10px] font-medium"
      style={{ borderColor: rgb(SITE_COLOR), color: rgb(SITE_COLOR) }}
    >
      1
    </span>
  ),
};

/** Glass chip used for the staff key and health status. */
const chip = "inline-flex h-11 items-center rounded-full bg-glass text-[13.5px] font-semibold shadow-bar backdrop-blur-[20px]";
/** Quiet mono tag next to a chip (mock and cached mode). */
const tag = "inline-flex h-6 items-center rounded-full bg-well px-2.5 font-mono text-[10px] uppercase tracking-[0.07em] text-soft";

export default function TopBar({ cities, city, onCity, layers, onLayers }: Props) {
  return (
    <header className="relative z-30 flex flex-none flex-wrap items-center gap-x-3 gap-y-2">
      <Link href="/" aria-label="Bin-It home" className="order-1 flex h-12 items-center gap-2.5 pl-1 pr-2.5">
        <HexMark />
        <span className="dot-num text-[26px]">Bin-It</span>
        <span className="hidden h-[22px] items-center rounded-full bg-well px-[9px] font-mono text-[10.5px] uppercase tracking-[0.08em] text-soft sm:inline-flex">
          Staff
        </span>
      </Link>
      <div className="order-3 sm:order-2">
        <CitySwitcher cities={cities} value={city} onChange={onCity} />
      </div>
      <div className="order-4 sm:order-3">
        <LayerMenu layers={layers} onLayers={onLayers} />
      </div>
      <div className="order-2 ml-auto flex items-center gap-2.5 sm:order-4">
        <StaffKeyChip />
        <HealthChip />
      </div>
    </header>
  );
}

function LayerMenu({ layers, onLayers }: { layers: LayerToggles; onLayers: (l: LayerToggles) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = Object.values(layers).filter(Boolean).length;

  // close on an outside press or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-12 items-center gap-2.5 rounded-full bg-glass px-4 text-[14px] font-semibold shadow-bar backdrop-blur-[20px] transition-colors hover:bg-white max-sm:px-3.5"
      >
        <LayersIcon />
        <span className="max-sm:sr-only">Layers</span>
        <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-well px-1.5 font-mono text-[11px] text-soft max-sm:hidden">
          {count}
        </span>
        <ChevronIcon size={14} className={`text-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-float bg-white/95 p-2.5 shadow-pop backdrop-blur-[22px]">
          {(Object.keys(LAYER_NAMES) as (keyof LayerToggles)[]).map((k) => (
            <Tooltip key={k} content={LAYER_HINTS[k]} containerClassName="flex w-full">
              <label className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-[18px] pl-3 pr-3.5 text-[14px] font-semibold transition-colors hover:bg-well">
                <input
                  type="checkbox"
                  className="dl-check"
                  checked={layers[k]}
                  onChange={(e) => onLayers({ ...layers, [k]: e.target.checked })}
                />
                <span className="flex-1">{LAYER_NAMES[k]}</span>
                {LAYER_SWATCH[k]}
              </label>
            </Tooltip>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffKeyChip() {
  const key = useStaffKey();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  if (cachedMode) return null;
  if (key) {
    return (
      <Tooltip content="The staff key is kept for this browser session only. Clear it to stop changing ticket status.">
        <div className={`${chip} gap-2.5 px-1.5`}>
          <span className="flex size-8 items-center justify-center rounded-full bg-sun-wash">
            <KeyIcon size={17} weight={1.8} />
          </span>
          <span className="max-sm:sr-only">Staff key set</span>
          <button
            onClick={() => setStaffKey(null)}
            aria-label="Clear staff key"
            className="flex size-8 items-center justify-center rounded-full text-soft transition-colors hover:bg-well"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      </Tooltip>
    );
  }
  if (!open) {
    return (
      <Tooltip content="Changing a ticket's status needs the staff key. Reading the queue and map does not.">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-11 items-center gap-2.5 rounded-full border-[1.5px] border-dashed border-quiet/50 bg-white/60 pl-3.5 pr-[18px] text-[13.5px] font-semibold transition-colors hover:bg-white max-sm:px-3.5"
        >
          <KeyIcon size={17} weight={1.8} />
          <span className="max-sm:sr-only">Enter staff key</span>
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
      className="flex items-center gap-2"
    >
      <input
        autoFocus
        type="password"
        aria-label="Staff key"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Staff key"
        className={`${inputPill} w-40`}
      />
      <button className={cn(btnPrimary, "h-11 px-5 text-[14px]")}>Save</button>
    </form>
  );
}

function HealthChip() {
  const health = useHealth();
  if (cachedMode) {
    return (
      <Tooltip content="Showing saved responses. Nothing is fetched live and status changes are disabled.">
        <span className="inline-flex h-[26px] items-center gap-[7px] rounded-full bg-sun-wash px-[11px] font-mono text-[10px] uppercase tracking-[0.07em] text-sun-ink">
          <span className="size-[7px] rounded-full bg-[#d9a21a]" />
          Cached data (offline mode)
        </span>
      </Tooltip>
    );
  }
  const h = health.data;
  const ok = h?.database === "ok" && h?.classifier === "ok";
  const dot = health.isError
    ? "bg-coral-pulse shadow-[0_0_0_4px_rgb(255_99_99/0.28)]"
    : !h
      ? "border-[1.5px] border-quiet"
      : ok
        ? "bg-success-green shadow-[0_0_0_4px_rgb(89_212_153/0.28)]"
        : "bg-[#f2b134] shadow-[0_0_0_4px_rgb(242_177_52/0.28)]";
  const title = health.isError
    ? `API unreachable: ${health.error.message}`
    : h
      ? `Database: ${h.database} · Classifier: ${h.classifier}${h.use_mocks ? " · serving mock data" : ""}`
      : "Checking…";
  return (
    <span className="flex items-center gap-2">
      {h?.use_mocks && <span className={`${tag} max-sm:hidden`}>Mock API data</span>}
      <Tooltip content={title}>
        <span className={`${chip} gap-2.5 pl-[18px] pr-5`} aria-label={title} tabIndex={0}>
          <span className={`inline-block size-[9px] rounded-full ${dot}`} />
          {health.isError ? "Offline" : !h ? "Checking" : ok ? "Live" : "Degraded"}
        </span>
      </Tooltip>
    </span>
  );
}
