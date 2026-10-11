"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { Recommendation } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import { DotBar, card } from "@/components/dash/ui";
import { Empty, ErrorRetry, Loading, UnderReportedBadge } from "./States";
import TopNControl from "./TopNControl";

const ROWS = 20;
const DOTS = 14;

type Props = {
  query: UseQueryResult<Recommendation[]>;
  isUnderReported: (r: Recommendation) => boolean;
  topN: number;
  onTopN: (n: number) => void;
  selectedRank: number | null;
  onSelect: (r: Recommendation) => void;
};

export default function BinsTab({ query, isUnderReported, topN, onTopN, selectedRank, onSelect }: Props) {
  if (query.isPending) return <Loading what="recommended sites" />;
  if (query.isError) return <ErrorRetry error={query.error} onRetry={() => query.refetch()} />;
  if (query.data.length === 0) return <Empty>No model results loaded for this city.</Empty>;

  const rows = query.data.slice(0, ROWS);
  const maxGain = Math.max(...rows.map((r) => r.gain), 1e-9);
  const n = Math.min(topN, query.data.length);

  return (
    <>
      <section aria-label="Top sites" className={`${card} flex-none px-[18px] py-4`}>
        <TopNControl
          value={topN}
          max={Math.min(50, query.data.length)}
          onChange={onTopN}
          caption="How many ranked sites to show on the map and include in a scenario."
        />
        <p className="mt-2.5 text-[12.5px] leading-[1.55] text-quiet">
          Ranked by estimated gain: demand-weighted distance to the nearest bin that each site would remove. The top {n}{" "}
          are numbered on the map and feed the Scenario tab.
        </p>
      </section>

      <section aria-label="Ranked sites" className={`${card} flex-none px-2 pb-3 pt-2`}>
        <ol className="flex flex-col gap-0.5">
          {rows.map((r) => {
            const selected = r.rank === selectedRank;
            return (
              <li key={r.rank}>
                <button
                  onClick={() => onSelect(r)}
                  aria-pressed={selected}
                  className={`flex w-full items-start gap-3 rounded-row p-3 text-left transition-colors ${
                    selected ? "bg-sun-wash shadow-[inset_0_0_0_1.5px_rgb(217_162_26/0.55)]" : "hover:bg-white/75"
                  }`}
                >
                  <Tooltip
                    content={
                      <span className="block">
                        <span className="block font-bold">Site #{r.rank}</span>
                        <span className="mt-1 block">
                          Estimated gain {r.gain.toFixed(3)} · {Math.round(r.nearest_bin_m)} m to nearest bin ·{" "}
                          {r.nearby_reports} nearby reports
                        </span>
                        {isUnderReported(r) && <span className="mt-1 block">In an under-reported area</span>}
                      </span>
                    }
                  >
                    {/* the same white disc with a green ring and green number as the map's site marker */}
                    <span
                      className={`flex size-[38px] flex-none items-center justify-center rounded-full border-2 bg-white font-mono text-[14px] font-medium ${
                        r.rank <= topN ? "border-[#166534] text-[#166534]" : "border-rim text-quiet"
                      }`}
                    >
                      {r.rank}
                    </span>
                  </Tooltip>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-[1.5] text-strong">
                      {r.rationale || "No reason written yet."}
                    </span>
                    <span className="mt-2 flex items-center gap-2.5">
                      <Tooltip content={`Estimated gain ${r.gain.toFixed(3)}, relative to the best site in this list.`}>
                        <DotBar filled={(r.gain / maxGain) * DOTS} total={DOTS} />
                      </Tooltip>
                      <span className="font-mono text-[11px] text-soft">gain {r.gain.toFixed(3)}</span>
                    </span>
                    <span className="mt-1.5 block text-[12.5px] text-soft">
                      {Math.round(r.nearest_bin_m)} m to nearest bin · {r.nearby_reports} nearby{" "}
                      {r.nearby_reports === 1 ? "report" : "reports"}
                    </span>
                    {isUnderReported(r) && (
                      <span className="mt-2 block">
                        <UnderReportedBadge />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {query.data.length > ROWS && (
          <p className="mx-3.5 mb-0.5 mt-2.5 text-xs text-quiet">
            Showing the top {ROWS} of {query.data.length} sites.
          </p>
        )}
      </section>
    </>
  );
}
