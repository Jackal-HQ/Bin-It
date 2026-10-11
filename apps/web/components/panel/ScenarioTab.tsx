"use client";

// What-if: add the top N recommended bins on a throwaway Neon branch and compare coverage.
// The branch is ALWAYS deleted: on Reset, when the tab closes (unmount, including city
// change, since the dashboard keys this tab by city) and when the page is hidden.
// The free plan allows 10 branches including main.
import { useEffect, useRef, useState } from "react";
import { ApiError, api, cachedMode } from "@/lib/api";
import type { Recommendation, Scenario } from "@/lib/types";
import { Empty, ErrorRetry } from "./States";
import TopNControl from "./TopNControl";

type Props = {
  city: string;
  sites: Recommendation[] | undefined;
  topN: number;
  onTopN: (n: number) => void;
  onActiveSites: (sites: Recommendation[] | null) => void;
};

type Phase = "idle" | "running" | "done" | "deleting" | "error";

function friendlyError(e: unknown) {
  if (e instanceof ApiError && (e.status === 429 || (/branch/i.test(e.message) && /limit|maximum|quota/i.test(e.message)))) {
    return new Error("Too many scenario branches are open on Neon right now. Try again in a minute.");
  }
  return e;
}

export default function ScenarioTab({ city, sites, topN, onTopN, onActiveSites }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Scenario | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const liveId = useRef<string | null>(null); // the branch that still needs deleting
  const alive = useRef(true);
  const runToken = useRef(0);

  useEffect(() => {
    alive.current = true;
    const onHide = () => {
      if (liveId.current) api.deleteScenarioOnExit(liveId.current);
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      alive.current = false;
      window.removeEventListener("pagehide", onHide);
      if (liveId.current) api.deleteScenarioOnExit(liveId.current);
      liveId.current = null;
      onActiveSites(null);
    };
  }, [onActiveSites]);

  const n = Math.min(topN, sites?.length ?? 0);
  const proposed = sites?.slice(0, n) ?? [];

  async function run() {
    const token = ++runToken.current;
    setPhase("running");
    setError(null);
    setWarning(null);
    try {
      const { scenario } = await api.createScenario(
        city,
        proposed.map(({ lat, lng }) => ({ lat, lng })),
      );
      if (!alive.current || token !== runToken.current) {
        api.deleteScenarioOnExit(scenario.id); // tab closed while the branch was being made
        return;
      }
      liveId.current = scenario.id;
      setResult(scenario);
      setPhase("done");
      onActiveSites(proposed);
    } catch (e) {
      if (!alive.current) return;
      setError(friendlyError(e));
      setPhase("error");
    }
  }

  async function reset() {
    const id = liveId.current;
    liveId.current = null;
    setResult(null);
    onActiveSites(null);
    if (!id) {
      setPhase("idle");
      return;
    }
    setPhase("deleting");
    try {
      await api.deleteScenario(id);
    } catch (e) {
      if (alive.current) {
        setWarning(`The scenario branch may not have been deleted (${e instanceof Error ? e.message : "unknown error"}). Check the Neon console.`);
      }
    }
    if (alive.current) setPhase("idle");
  }

  if (cachedMode) return <Empty>Scenarios need the live API and are off in cached-data mode.</Empty>;
  if (!sites) return <Empty>Loading recommended sites…</Empty>;
  if (sites.length === 0) return <Empty>No model results loaded for this city, so there is nothing to test.</Empty>;

  const busy = phase === "running" || phase === "deleting";

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-3">
        <TopNControl value={topN} max={Math.min(50, sites.length)} onChange={onTopN} disabled={busy || phase === "done"} />
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={busy || phase === "done"}
            className="flex items-center gap-2 rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-50"
          >
            {phase === "running" && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {phase === "running" ? "Running on a Neon branch…" : `Add top ${n} bins`}
          </button>
          <button
            onClick={reset}
            disabled={busy || (phase !== "done" && phase !== "error")}
            className="rounded-md border border-zinc-300 px-4 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            {phase === "deleting" ? "Deleting branch…" : "Reset"}
          </button>
        </div>
      </div>

      {phase === "error" && <ErrorRetry error={error} onRetry={run} />}
      {warning && <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{warning}</p>}

      {result && (
        <div className="grid grid-cols-2 gap-3">
          <Figure
            title="Average distance to nearest bin"
            before={`${Math.round(result.before.avg_distance_m)} m`}
            after={`${Math.round(result.after.avg_distance_m)} m`}
            delta={result.after.avg_distance_m - result.before.avg_distance_m}
            unit=" m"
            lowerIsBetter
          />
          <Figure
            title="Demand within 150 m of a bin"
            before={`${Math.round(result.before.coverage_150m_pct)}%`}
            after={`${Math.round(result.after.coverage_150m_pct)}%`}
            delta={result.after.coverage_150m_pct - result.before.coverage_150m_pct}
            unit=" pts"
          />
        </div>
      )}

      <div className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">Assumptions</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Results are estimates from a model, not measured outcomes.</li>
          <li>&quot;Covered&quot; means within 150 m of a bin. 150 m is an assumption.</li>
          <li>Distances are weighted by expected demand per H3 cell.</li>
          <li>Each run uses a temporary Neon branch that is deleted on Reset or when you leave this tab.</li>
        </ul>
      </div>
    </div>
  );
}

function Figure(props: { title: string; before: string; after: string; delta: number; unit: string; lowerIsBetter?: boolean }) {
  const { title, before, after, delta, unit, lowerIsBetter } = props;
  const better = lowerIsBetter ? delta < 0 : delta > 0;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="text-xs text-zinc-500">{title} (estimated)</p>
      <p className="mt-1 flex items-baseline gap-1.5 text-sm">
        <span className="text-zinc-500">{before}</span>
        <span aria-hidden>→</span>
        <span className="text-lg font-semibold">{after}</span>
      </p>
      <p className={`text-sm font-medium ${better ? "text-green-700 dark:text-green-400" : "text-zinc-600"}`}>
        {sign}
        {Math.abs(Math.round(delta))}
        {unit}
      </p>
    </div>
  );
}
