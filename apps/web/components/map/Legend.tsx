import {
  BIN_COLOR,
  RISK_GRADIENT,
  SEVERITY_COLOR,
  SITE_COLOR,
  UNDER_REPORTED_COLOR,
  rgb,
  severityText,
} from "@/lib/labels";
import type { LayerToggles } from "@/lib/selection";

type Props = { layers: LayerToggles; anyUnderReported: boolean; ratesLoaded: boolean };

export default function Legend({ layers, anyUnderReported, ratesLoaded }: Props) {
  return (
    <details open className="group max-w-[260px] rounded-lg bg-white/95 p-3 text-xs text-zinc-700 shadow-md dark:bg-zinc-900/95 dark:text-zinc-300">
      <summary className="cursor-pointer list-none font-semibold text-zinc-900 dark:text-zinc-100">
        Legend <span className="font-normal text-zinc-500 group-open:hidden">(show)</span>
      </summary>
      <div className="mt-2 space-y-2">
        {layers.pins && (
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Reports (size and color = severity)</div>
            <div className="mt-1 flex items-center gap-2">
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
            <div className="mt-1 flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-zinc-900 bg-zinc-400" />
              Dark ring = demo data. Number = merged reports.
            </div>
          </div>
        )}
        {layers.risk && (
          <div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">Expected overflow, ranked within this city (model estimate)</div>
            <div className="mt-1 h-2 rounded" style={{ background: RISK_GRADIENT }} />
            <div className="flex justify-between">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}
        {layers.under && (
          <div>
            <div className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100">
              <span className="inline-block h-3 w-3 border-[3px]" style={{ borderColor: rgb(UNDER_REPORTED_COLOR) }} />
              Under-reported area
            </div>
            <p className="mt-0.5">
              {!anyUnderReported
                ? "No under-reported areas flagged yet: needs reports per 1,000 residents from the data pipeline."
                : ratesLoaded
                  ? "High expected overflow but few reports per 1,000 residents (top / bottom quartile; cutoffs are tunable assumptions)."
                  : "Flagged by the data pipeline. Reports per 1,000 residents are not loaded yet, so the flag is not yet checked against reporting rates."}
            </p>
          </div>
        )}
        {layers.bins && (
          <div className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: rgb(BIN_COLOR) }} />
            Existing bin
          </div>
        )}
        {layers.sites && (
          <div className="flex items-center gap-1">
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white text-[9px] font-bold"
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
