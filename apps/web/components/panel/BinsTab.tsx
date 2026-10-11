"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { Recommendation } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import { Empty, ErrorRetry, Loading, UnderReportedBadge } from "./States";
import TopNControl from "./TopNControl";

const ROWS = 20;

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

  return (
    <div>
      <div className="border-b border-rc-border p-3">
        <TopNControl value={topN} max={Math.min(50, query.data.length)} onChange={onTopN} />
        <p className="mt-1.5 text-xs leading-[1.5] text-smoke">
          Ranked by estimated gain: demand-weighted distance to the nearest bin that each site would remove. The top{" "}
          {Math.min(topN, query.data.length)} are numbered on the map and feed the Scenario tab.
        </p>
      </div>
      <ol>
        {rows.map((r) => (
          <li key={r.rank}>
            <button
              onClick={() => onSelect(r)}
              className={`flex w-full gap-3 border-b border-rc-border/60 p-3 text-left transition-colors duration-200 hover:bg-white/[0.04] ${
                r.rank === selectedRank ? "bg-coral-pulse/10 shadow-[inset_2px_0_0_0_var(--color-coral-pulse)]" : ""
              }`}
            >
              <Tooltip
                content={
                  <span className="block">
                    <span className="block font-medium text-white">Site #{r.rank}</span>
                    <span className="mt-1 block">
                      Estimated gain {r.gain.toFixed(3)} · {Math.round(r.nearest_bin_m)} m to nearest bin ·{" "}
                      {r.nearby_reports} nearby reports
                    </span>
                    {isUnderReported(r) && (
                      <span className="mt-1 block text-coral-pulse">In an under-reported area</span>
                    )}
                  </span>
                }
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold ${
                    r.rank <= topN ? "border-mist text-white" : "border-rc-border text-smoke"
                  }`}
                >
                  {r.rank}
                </span>
              </Tooltip>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-[1.5] text-white">
                  {r.rationale || "No reason written yet."}
                </span>
                <span className="mt-2 flex items-center gap-2">
                  <Tooltip content={`Estimated gain ${r.gain.toFixed(3)}, relative to the best site in this list.`}>
                    <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-graphite">
                      <span className="block h-full rounded-full bg-mist/80" style={{ width: `${(r.gain / maxGain) * 100}%` }} />
                    </span>
                  </Tooltip>
                  <span className="text-xs text-smoke">
                    {Math.round(r.nearest_bin_m)} m to nearest bin · {r.nearby_reports} nearby reports
                  </span>
                </span>
                {isUnderReported(r) && (
                  <span className="mt-2 block">
                    <UnderReportedBadge />
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {query.data.length > ROWS && (
        <p className="p-3 text-xs text-smoke">
          Showing the top {ROWS} of {query.data.length} sites.
        </p>
      )}
    </div>
  );
}
