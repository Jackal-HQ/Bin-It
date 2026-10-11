"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import type { Recommendation } from "@/lib/types";
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
      <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
        <TopNControl value={topN} max={Math.min(50, query.data.length)} onChange={onTopN} />
        <p className="mt-1 text-xs text-zinc-500">
          Ranked by estimated gain: demand-weighted distance to the nearest bin that each site would remove. The top {Math.min(topN, query.data.length)} are numbered on the map and feed the Scenario tab.
        </p>
      </div>
      <ol>
        {rows.map((r) => (
          <li key={r.rank}>
            <button
              onClick={() => onSelect(r)}
              className={`flex w-full gap-3 border-b border-zinc-100 p-3 text-left hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
                r.rank === selectedRank ? "bg-green-50 dark:bg-green-950" : ""
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-brand text-xs font-bold ${
                  r.rank <= topN ? "text-brand" : "border-zinc-300 text-zinc-400"
                }`}
              >
                {r.rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-zinc-900 dark:text-zinc-100">{r.rationale || "No reason written yet."}</span>
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 w-24 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800" title={`Gain ${r.gain.toFixed(3)}`}>
                    <span className="block h-full bg-brand" style={{ width: `${(r.gain / maxGain) * 100}%` }} />
                  </span>
                  <span className="text-xs text-zinc-500">
                    {Math.round(r.nearest_bin_m)} m to nearest bin · {r.nearby_reports} nearby reports
                  </span>
                </span>
                {isUnderReported(r) && (
                  <span className="mt-1.5 block">
                    <UnderReportedBadge />
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {query.data.length > ROWS && (
        <p className="p-3 text-xs text-zinc-500">Showing the top {ROWS} of {query.data.length} sites.</p>
      )}
    </div>
  );
}
