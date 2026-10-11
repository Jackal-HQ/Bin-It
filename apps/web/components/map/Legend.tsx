"use client";

import { useState, useSyncExternalStore } from "react";
import {
  BIN_COLOR,
  RISK_GRADIENT,
  SEVERITY_COLOR,
  SITE_RING,
  UNDER_REPORTED_COLOR,
  rgb,
  severityText,
} from "@/lib/labels";
import type { LayerToggles } from "@/lib/selection";

const TALL = "(min-height: 760px)";
function subscribeTall(cb: () => void) {
  const mq = window.matchMedia(TALL);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

type Props = { layers: LayerToggles; anyUnderReported: boolean; ratesLoaded: boolean };

const heading = "font-medium text-white";

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
      className="max-h-full min-h-0 max-w-[270px] overflow-y-auto rounded-[12px] border border-rc-border bg-void-black/85 px-3 text-xs leading-[1.5] text-ash backdrop-blur-[24px] open:pb-3"
    >
      {/* stays pinned while the legend scrolls, so Hide is always reachable */}
      <summary className="sticky top-0 -mx-3 flex cursor-pointer list-none select-none items-center justify-between gap-3 rounded-t-[12px] bg-void-black px-3 py-2 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.073em] text-smoke">Legend</span>
        <span className="flex items-center gap-1 rounded-[6px] border border-rc-border px-2 py-0.5 text-[11px] font-medium text-ash hover:text-white">
          {open ? "Hide" : "Show"}
          <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${open ? "" : "rotate-180"}`}>
            <path
              d="M3 4.5 6 7.5 9 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>
      <div className="mt-1 space-y-3">
        {layers.pins && (
          <div>
            <div className={heading}>Reports (size and color = severity)</div>
            <div className="mt-1.5 flex items-center gap-3">
              {[1, 2, 3].map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <span
                    className="inline-block rounded-full border-2 border-white"
                    style={{ background: rgb(SEVERITY_COLOR[s]), width: 8 + 4 * s, height: 8 + 4 * s }}
                  />
                  {severityText(s)}
                </span>
              ))}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-smoke bg-ash" />
              Grey ring = demo data, white ring = real report. Number = merged reports.
            </div>
          </div>
        )}
        {layers.risk && (
          <div>
            <div className={heading}>Expected overflow, ranked within this city (model estimate)</div>
            <div className="mt-1.5 h-2 rounded-full" style={{ background: RISK_GRADIENT }} />
            <div className="mt-0.5 flex justify-between text-smoke">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
        {layers.under && (
          <div>
            <div className={`flex items-center gap-1.5 ${heading}`}>
              <span
                className="inline-block h-3 w-3 border-2 border-dashed"
                style={{ borderColor: rgb(UNDER_REPORTED_COLOR) }}
              />
              Under-reported area
            </div>
            <p className="mt-1 text-smoke">
              {!anyUnderReported
                ? "No under-reported areas flagged yet: needs reports per 1,000 residents from the data pipeline."
                : ratesLoaded
                  ? "High expected overflow but few reports per 1,000 residents (top / bottom quartile; cutoffs are tunable assumptions)."
                  : "Flagged by the data pipeline. Reports per 1,000 residents are not loaded yet, so the flag is not yet checked against reporting rates."}
            </p>
          </div>
        )}
        {layers.bins && (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full border border-void-black"
              style={{ background: rgb(BIN_COLOR) }}
            />
            Existing bin
          </div>
        )}
        {layers.sites && (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 bg-void-black font-mono text-[9px] font-bold text-white"
              style={{ borderColor: rgb(SITE_RING) }}
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
