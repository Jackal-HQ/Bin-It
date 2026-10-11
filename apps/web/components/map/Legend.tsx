"use client";

import { useState, useSyncExternalStore } from "react";
import {
  BIN_COLOR,
  RISK_GRADIENT,
  SEVERITY_COLOR,
  SITE_COLOR,
  rgb,
  severityText,
} from "@/lib/labels";
import type { LayerToggles } from "@/lib/selection";
import { ChevronIcon, HexOutline } from "@/components/dash/icons";

const TALL = "(min-height: 760px)";
function subscribeTall(cb: () => void) {
  const mq = window.matchMedia(TALL);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

type Props = { layers: LayerToggles; anyUnderReported: boolean; ratesLoaded: boolean };

const heading = "font-bold text-strong";

/** Frosted legend over the map: one entry per visible layer. Colors are the map's, unchanged. */
export default function Legend({ layers, anyUnderReported, ratesLoaded }: Props) {
  // Start collapsed on short screens (scaled laptops, projectors) so the map stays visible;
  // after the first click the user's choice wins.
  const tall = useSyncExternalStore(subscribeTall, () => window.matchMedia(TALL).matches, () => true);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? tall;
  return (
    <details
      open={open}
      onToggle={(e) => {
        if (e.currentTarget.open !== open) setUserOpen(e.currentTarget.open);
      }}
      className="max-h-full min-h-0 w-[280px] max-w-full overflow-y-auto rounded-float bg-glass-strong px-4 text-xs leading-[1.45] text-soft shadow-float backdrop-blur-[22px] backdrop-saturate-[1.3] open:pb-4"
    >
      {/* stays pinned while the legend scrolls, so Hide is always reachable */}
      <summary className="sticky top-0 -mx-4 flex cursor-pointer list-none select-none items-center justify-between gap-3 rounded-t-float px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-quiet">Legend</span>
        <span className="flex h-7 items-center gap-1 rounded-full border border-rim pl-3 pr-2.5 text-xs font-semibold text-soft transition-colors hover:bg-well">
          {open ? "Hide" : "Show"}
          <ChevronIcon size={12} weight={2.4} up={!open} />
        </span>
      </summary>
      <div className="flex flex-col gap-3">
        {layers.pins && (
          <div>
            <div className={heading}>Reports (size and color = severity)</div>
            <div className="mt-[7px] flex items-center gap-3.5">
              {[1, 2, 3].map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span
                    className="inline-block rounded-full"
                    style={{ background: rgb(SEVERITY_COLOR[s]), width: 8 + 4 * s, height: 8 + 4 * s }}
                  />
                  {severityText(s)}
                </span>
              ))}
            </div>
            <div className="mt-[7px] flex items-center gap-2">
              <span className="inline-block size-3 shrink-0 rounded-full border-[2.5px] border-[#111827] bg-[#9ca3af]" />
              Dark ring = demo data. Number = merged reports.
            </div>
          </div>
        )}
        {layers.risk && (
          <div>
            <div className={heading}>Expected overflow, ranked within this city (model estimate)</div>
            <div className="mt-[7px] h-2 rounded-full" style={{ background: RISK_GRADIENT }} />
            <div className="mt-[3px] flex justify-between text-quiet">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
        {layers.under && (
          <div>
            <div className={`flex items-center gap-2 ${heading}`}>
              <HexOutline size={16} />
              Under-reported area
            </div>
            <p className="mt-[3px] text-quiet">
              {!anyUnderReported
                ? "No under-reported areas flagged yet: needs reports per 1,000 residents from the data pipeline."
                : ratesLoaded
                  ? "High expected overflow but few reports per 1,000 residents (top / bottom quartile; cutoffs are tunable assumptions)."
                  : "Flagged by the data pipeline. Reports per 1,000 residents are not loaded yet, so the flag is not yet checked against reporting rates."}
            </p>
          </div>
        )}
        {layers.bins && (
          <div className="flex items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full border-[1.5px] border-white shadow-[0_0_0_1px_rgb(60_52_28/0.18)]"
              style={{ background: rgb(BIN_COLOR) }}
            />
            Existing bin
          </div>
        )}
        {layers.sites && (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex size-5 items-center justify-center rounded-full border-2 bg-white font-mono text-[10px] font-medium"
              style={{ borderColor: rgb(SITE_COLOR), color: rgb(SITE_COLOR) }}
            >
              1
            </span>
            Recommended new bin, by rank
          </div>
        )}
      </div>
    </details>
  );
}
