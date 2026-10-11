"use client";

// The staff dashboard: map on the left, one side panel (Queue / Bins / Scenario) on the right.
// City, tab and selection live in the URL (?city=&tab=&sel=) so any demo state can be linked.
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { latLngToCell } from "h3-js";
import type { TicketFilters } from "@/lib/api";
import { rankCells } from "@/lib/labels";
import { useCells, useCities, useNearby, useRecommendations, useTickets } from "@/lib/hooks";
import { DEFAULT_LAYERS, parseSelection, selectionParam, type LayerToggles, type Selection } from "@/lib/selection";
import type { Bbox, Recommendation, Ticket } from "@/lib/types";
import type { FlyTarget } from "./map/MapView";
import Legend from "./map/Legend";
import BinsTab from "./panel/BinsTab";
import DetailCard from "./panel/DetailCard";
import QueueTab from "./panel/QueueTab";
import ScenarioTab from "./panel/ScenarioTab";
import { ErrorRetry, Loading } from "./panel/States";
import TopBar from "./TopBar";

const MapView = dynamic(() => import("./map/MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-zinc-100 dark:bg-zinc-900" />,
});

const TABS = [
  { id: "queue", name: "Queue" },
  { id: "bins", name: "Bins" },
  { id: "scenario", name: "Scenario" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const H3_RES = 9;
const EMPTY: never[] = [];

function useUrlState() {
  const params = useSearchParams();
  const city = params.get("city") || "orlando";
  const rawTab = params.get("tab");
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "queue";
  const selection = parseSelection(params.get("sel"));

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      // Next syncs useSearchParams with native history calls; no server round-trip.
      window.history.replaceState(null, "", `?${next.toString()}`);
    },
    [params],
  );
  return { city, tab, selection, setParams };
}

export default function Dashboard() {
  const { city, tab, selection, setParams } = useUrlState();
  const cities = useCities();
  const cityObj = cities.data?.find((c) => c.slug === city);

  const [layers, setLayers] = useState<LayerToggles>(DEFAULT_LAYERS);
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [topN, setTopN] = useState(20);
  const [scenarioSites, setScenarioSites] = useState<Recommendation[] | null>(null);
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);

  const tickets = useTickets(city, filters, tab === "queue");
  const nearby = useNearby(city, bbox);
  const cells = useCells(city);
  const recs = useRecommendations(city);

  // Unknown ?city= -> first city from the API.
  useEffect(() => {
    if (cities.data && cities.data.length > 0 && !cityObj) setParams({ city: cities.data[0].slug, sel: null });
  }, [cities.data, cityObj, setParams]);

  const ranked = useMemo(() => rankCells(cells.data ?? EMPTY), [cells.data]);
  const cellsById = useMemo(() => new Map(ranked.map((c) => [c.h3_cell, c])), [ranked]);
  const isUnderReported = useCallback(
    (r: Recommendation) => cellsById.get(latLngToCell(r.lat, r.lng, H3_RES))?.under_reported === true,
    [cellsById],
  );
  const anyUnderReported = useMemo(() => ranked.some((c) => c.under_reported), [ranked]);
  const ratesLoaded = useMemo(() => ranked.some((c) => c.reports_per_1k != null), [ranked]);

  const n = Math.min(topN, recs.data?.length ?? 0);
  const mapSites = scenarioSites ?? recs.data?.slice(0, n) ?? EMPTY;

  // What the detail card shows.
  const queueTicket = selection?.kind === "ticket" ? tickets.data?.find((t) => t.id === selection.id) : undefined;
  const pinTicket = selection?.kind === "ticket" ? nearby.data?.tickets.find((t) => t.id === selection.id) : undefined;
  // the queue row has first/last seen; a pin may be all we have when the queue is filtered
  const detailTicket: Ticket | undefined = queueTicket ? { ...pinTicket, ...queueTicket } : pinTicket;
  const selSite = selection?.kind === "site" ? recs.data?.find((r) => r.rank === selection.rank) : undefined;
  const selCell = selection?.kind === "cell" ? cellsById.get(selection.h3) : undefined;

  const select = useCallback(
    (s: Selection, at?: { lat: number; lng: number }) => {
      setParams({ sel: selectionParam(s) });
      if (at) setFlyTo({ lat: at.lat, lng: at.lng, zoom: 16, key: Date.now() });
    },
    [setParams],
  );

  const noScores = cells.isSuccess && cells.data.length === 0;

  return (
    // Side by side from 700px wide (laptops with display scaling are often under 768px).
    // Narrower: map on top and the page scrolls, so the panel is never squeezed.
    <div className="flex min-h-dvh flex-col min-[700px]:h-dvh">
      <TopBar
        cities={cities.data}
        city={city}
        onCity={(slug) => {
          setParams({ city: slug, sel: null });
          setBbox(null);
          setScenarioSites(null);
        }}
        layers={layers}
        onLayers={setLayers}
      />

      <div className="flex flex-col min-[700px]:min-h-0 min-[700px]:flex-1 min-[700px]:flex-row">
        {/* map */}
        <div className="relative h-[55vh] shrink-0 min-[700px]:h-auto min-[700px]:flex-1">
          {cities.isError ? (
            <ErrorRetry error={cities.error} onRetry={() => cities.refetch()} />
          ) : !cityObj ? (
            <Loading what="cities" />
          ) : (
            <MapView
              city={cityObj}
              flyTo={flyTo}
              cells={ranked}
              tickets={nearby.data?.tickets ?? EMPTY}
              bins={nearby.data?.bins ?? EMPTY}
              sites={mapSites}
              scenarioActive={scenarioSites !== null}
              layers={layers}
              selection={selection}
              onSelect={(s) => select(s)}
              onBoundsChange={setBbox}
            />
          )}
          <div className="pointer-events-none absolute top-3 bottom-8 left-3 z-10 flex flex-col items-start justify-end gap-2">
            {noScores && (
              <div className="pointer-events-auto rounded-md bg-white/95 px-3 py-2 text-sm font-medium shadow dark:bg-zinc-900/95">
                No model results loaded for this city.
              </div>
            )}
            {(cells.isError || nearby.isError) && (
              <div className="pointer-events-auto max-w-xs rounded-md bg-white/95 shadow dark:bg-zinc-900/95">
                <ErrorRetry
                  error={cells.error ?? nearby.error}
                  onRetry={() => {
                    if (cells.isError) cells.refetch();
                    if (nearby.isError) nearby.refetch();
                  }}
                />
              </div>
            )}
            <div className="pointer-events-auto hidden min-h-0 sm:flex">
              <Legend layers={layers} anyUnderReported={anyUnderReported} ratesLoaded={ratesLoaded} />
            </div>
          </div>
        </div>

        {/* side panel */}
        <aside className="@container border-zinc-200 bg-white min-[700px]:min-h-0 min-[700px]:w-[clamp(320px,38vw,480px)] min-[700px]:flex-none min-[700px]:overflow-y-auto min-[700px]:border-l dark:border-zinc-800 dark:bg-zinc-950">
          {selection && (
            <DetailCard
              selection={selection}
              ticket={detailTicket}
              site={selSite}
              cell={selCell}
              siteUnderReported={selSite ? isUnderReported(selSite) : false}
              ratesLoaded={ratesLoaded}
              onClose={() => setParams({ sel: null })}
            />
          )}
          {/* the detail card and tab content scroll together; the tab bar stays pinned */}
          <nav className="sticky top-0 z-10 flex border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setParams({ tab: t.id })}
                className={`flex-1 px-3 py-2 text-sm font-medium ${
                  tab === t.id ? "border-b-2 border-brand text-brand" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {t.name}
              </button>
            ))}
          </nav>
          <div>
            {tab === "queue" && (
              <QueueTab
                city={city}
                query={tickets}
                filters={filters}
                onFilters={setFilters}
                selectedId={selection?.kind === "ticket" ? selection.id : null}
                onSelect={(t) => select({ kind: "ticket", id: t.id }, t)}
              />
            )}
            {tab === "bins" && (
              <BinsTab
                query={recs}
                isUnderReported={isUnderReported}
                topN={topN}
                onTopN={setTopN}
                selectedRank={selection?.kind === "site" ? selection.rank : null}
                onSelect={(r) => select({ kind: "site", rank: r.rank }, r)}
              />
            )}
            {tab === "scenario" && (
              <ScenarioTab key={city} city={city} sites={recs.data} topN={topN} onTopN={setTopN} onActiveSites={setScenarioSites} />
            )}
          </div>
        </aside>
      </div>

      <footer className="border-t border-zinc-200 px-4 py-1.5 text-[11px] leading-snug text-zinc-500 dark:border-zinc-800">
        Projected changes are model estimates, not measured outcomes. The model target is litter-related complaint density,
        not measured bin overflow. Orlando has no local complaint data: its scores come from a model trained on NYC and
        Chicago and are lightly validated. Rows marked &quot;Demo data&quot; are synthetic.
      </footer>
    </div>
  );
}
