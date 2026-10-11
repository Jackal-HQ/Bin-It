"use client";

// What-if: add the top N recommended bins on a throwaway Neon branch and compare coverage.
// The branch is ALWAYS deleted: on Reset, when the tab closes (unmount, including city
// change, since the dashboard keys this tab by city) and when the page is hidden.
// The free plan allows 10 branches including main.
import { useEffect, useRef, useState } from "react";
import { ApiError, api, cachedMode } from "@/lib/api";
import type { Recommendation, Scenario } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import { cn } from "@/lib/utils";
import { DotSpinner, PlusIcon, ResetIcon } from "@/components/dash/icons";
import { DotGauge, btnPrimary, btnSecondary, card } from "@/components/dash/ui";
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
    <>
      <section aria-label="Scenario controls" className={`${card} flex-none px-[18px] pb-[18px] pt-4`}>
        <TopNControl
          value={topN}
          max={Math.min(50, sites.length)}
          onChange={onTopN}
          disabled={busy || phase === "done"}
          caption="Number of ranked sites to add as new bins in this what-if."
        />
        <div className="mt-3.5 flex gap-2">
          <button onClick={run} disabled={busy || phase === "done"} className={cn(btnPrimary, "flex-1 pl-3 pr-5")}>
            {phase === "running" ? (
              <>
                <DotSpinner className="text-white" />
                Running on a Neon branch…
              </>
            ) : (
              <>
                <span className="flex size-[26px] items-center justify-center rounded-full bg-sun text-strong">
                  <PlusIcon size={14} weight={2.4} />
                </span>
                Add top {n} bins
              </>
            )}
          </button>
          <button
            onClick={reset}
            disabled={busy || (phase !== "done" && phase !== "error")}
            className={cn(btnSecondary, "h-12 px-5 text-[14px]")}
          >
            {phase === "deleting" ? (
              <>
                <DotSpinner size={16} />
                Deleting branch…
              </>
            ) : (
              <>
                <ResetIcon size={16} />
                Reset
              </>
            )}
          </button>
        </div>
      </section>

      {phase === "error" && <ErrorRetry error={error} onRetry={run} />}
      {warning && <ErrorRetry error={new Error(warning)} />}

      {result && (
        <div className="grid flex-none grid-cols-2 gap-3">
          <CoverageCard before={result.before.coverage_150m_pct} after={result.after.coverage_150m_pct} />
          <DistanceCard before={result.before.avg_distance_m} after={result.after.avg_distance_m} />
        </div>
      )}

      <section
        aria-label="Assumptions"
        className="flex-none rounded-card border-[1.5px] border-dotted border-sun-deep/50 bg-sun/20 px-[18px] pb-[18px] pt-4"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#6b5410]">Assumptions</span>
          <span className="inline-flex h-[22px] items-center rounded-full bg-charcoal/10 px-2.5 font-mono text-[10px] uppercase tracking-[0.07em] text-[#3e3b33]">
            Estimates
          </span>
        </div>
        <ul className="mt-3 flex flex-col gap-[9px] text-[13px] leading-[1.5] text-[#3e3b33]">
          {[
            "Results are estimates from a model, not measured outcomes.",
            "\u201cCovered\u201d means within 150 m of a bin. 150 m is an assumption.",
            "Distances are weighted by expected demand per H3 cell.",
            "Each run uses a temporary Neon branch that is deleted on Reset or when you leave this tab.",
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-charcoal" />
              {t}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/** "+17 pts" / "−210 m": a chip that is moss when the change is an improvement. */
function Delta({ delta, unit, lowerIsBetter, onDark }: { delta: number; unit: string; lowerIsBetter?: boolean; onDark?: boolean }) {
  const better = lowerIsBetter ? delta < 0 : delta > 0;
  const sign = delta > 0 ? "+" : delta < 0 ? "\u2212" : "";
  const tone = better
    ? onDark
      ? "bg-[rgb(155_235_196/0.16)] text-[#9bebc4]"
      : "bg-moss-wash text-[#1f5e3e]"
    : onDark
      ? "bg-white/10 text-on-charcoal"
      : "bg-well text-soft";
  return (
    <span className={`inline-flex h-[26px] items-center rounded-full px-[11px] text-[12.5px] font-bold ${tone}`}>
      {sign}
      {Math.abs(Math.round(delta))}
      {unit}
    </span>
  );
}

function CoverageCard({ before, after }: { before: number; after: number }) {
  const b = Math.round(before);
  const a = Math.round(after);
  return (
    <section aria-label="Demand within 150 m of a bin" className="rounded-card bg-glass-strong px-3.5 pb-4 pt-3.5 shadow-card backdrop-blur-[24px]">
      <Tooltip content="Share of expected demand that sits within 150 m of a bin. 150 m is an assumption, not a measured walking threshold. Higher is better.">
        <p className="font-mono text-[10px] uppercase leading-[1.5] tracking-[0.07em] text-quiet">
          Demand within 150 m of a bin (estimated)
        </p>
      </Tooltip>
      <div className="relative mt-2.5">
        <DotGauge before={before} after={after} label={`Dot gauge: coverage goes from ${b} percent to ${a} percent (estimated)`} />
        <div className="absolute inset-x-0 top-11 flex items-baseline justify-center gap-1">
          <span className="dot-num text-[40px]">{a}</span>
          <span className="text-[16px] font-bold text-soft">%</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-2">
        <Delta delta={after - before} unit=" pts" />
        <span className="text-[12.5px] font-medium text-soft">was {b}%</span>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-medium text-quiet">
        <span className="inline-flex items-center gap-[5px]">
          <span className="size-2 rounded-full bg-charcoal" />
          Now
        </span>
        <span className="inline-flex items-center gap-[5px]">
          <span className="size-2 rounded-full bg-sun ring-[0.9px] ring-sun-deep" />
          Added
        </span>
        <span className="inline-flex items-center gap-[5px]">
          <span className="size-2 rounded-full bg-[rgb(60_52_28/0.17)]" />
          Uncovered
        </span>
      </div>
    </section>
  );
}

function DistanceCard({ before, after }: { before: number; after: number }) {
  const b = Math.round(before);
  const a = Math.round(after);
  // dots scaled to the larger of the two, 26 at most, 7 px apart
  const scale = Math.max(before, after, 1);
  const dots = (v: number) => Math.max(0, Math.round((v / scale) * 26));
  return (
    <section
      aria-label="Average distance to nearest bin"
      className="relative overflow-hidden rounded-card bg-charcoal px-3.5 pb-4 pt-3.5 text-on-charcoal shadow-charcoal"
    >
      <div aria-hidden className="dot-grid absolute inset-0" />
      <div className="relative">
        <Tooltip content="Demand-weighted average distance from each area to its nearest bin, before and after adding the sites. Lower is better.">
          <p className="font-mono text-[10px] uppercase leading-[1.5] tracking-[0.07em] text-on-charcoal-quiet">
            Average distance to nearest bin (estimated)
          </p>
        </Tooltip>
        <div className="mt-[18px] flex items-baseline gap-1.5">
          <span className="dot-num text-[48px] text-white">{a}</span>
          <span className="text-[15px] font-bold text-on-charcoal-quiet">m</span>
        </div>
        <div className="mt-3.5 flex items-center gap-2">
          <Delta delta={after - before} unit=" m" lowerIsBetter onDark />
          <span className="text-[12.5px] font-medium text-on-charcoal-quiet">was {b} m</span>
        </div>
        <div className="mt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.07em] text-on-charcoal-quiet">Before · {b} m</p>
          <div
            aria-hidden
            className="mt-[7px] h-2 bg-[radial-gradient(circle_at_3.5px_4px,rgb(255_255_255/0.55)_2.4px,transparent_2.8px)] bg-[length:7px_8px] bg-repeat-x"
            style={{ width: dots(before) * 7 }}
          />
          <p className="mt-3.5 font-mono text-[10px] uppercase tracking-[0.07em] text-on-charcoal-quiet">After · {a} m</p>
          <div
            aria-hidden
            className="mt-[7px] h-2 bg-[radial-gradient(circle_at_3.5px_4px,#f6c944_2.4px,transparent_2.8px)] bg-[length:7px_8px] bg-repeat-x"
            style={{ width: dots(after) * 7 }}
          />
        </div>
      </div>
    </section>
  );
}
