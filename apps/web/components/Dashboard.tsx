"use client";

// The staff dashboard: map on the left, one side panel (Queue / Bins / Scenario) on the right.
// City, tab and selection live in the URL (?city=&tab=&sel=) so any demo state can be linked.
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
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
import { InfoIcon, PanelIcon } from "./dash/icons";
import TopBar from "./TopBar";

const MapView = dynamic(() => import("./map/MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-[#f4f0e8]" />,
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
  const panelOpen = params.get("panel") !== "hidden";

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
  return { city, tab, selection, panelOpen, setParams };
}

export default function Dashboard() {
  const { city, tab, selection, panelOpen, setParams } = useUrlState();
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
  const setPanel = (open: boolean) => setParams({ panel: open ? null : "hidden" });

  const counts: Record<Tab, number | undefined> = {
    queue: tickets.data?.length,
    bins: recs.data?.length,
    scenario: undefined,
  };

  return (
    // Side by side from 700px wide (laptops with display scaling are often under 768px).
    // Narrower: map on top and the page scrolls, so the panel is never squeezed.
    // With the panel hidden (?panel=hidden) the map fills the window at any width.
    <div className={`dash flex flex-col gap-3 p-4 font-ui antialiased ${panelOpen ? "min-h-dvh min-[700px]:h-dvh" : "h-dvh"}`}>
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

      <div
        className={
          panelOpen
            ? "flex flex-col gap-4 min-[700px]:min-h-0 min-[700px]:flex-1 min-[700px]:flex-row"
            : "flex min-h-0 flex-1"
        }
      >
        {/* map: rounded card, same place as before; only the chrome around it changed */}
        <div
          className={`relative isolate overflow-hidden rounded-map bg-[#f4f0e8] shadow-[0_0_0_1px_rgb(255_255_255/0.75),0_26px_50px_-30px_rgb(70_55_10/0.5)] ${
            panelOpen ? "h-[55vh] shrink-0 min-[700px]:h-auto min-[700px]:min-w-0 min-[700px]:flex-1" : "min-h-0 flex-1"
          }`}
        >
          {cities.isError ? (
            <div className="flex h-full items-center justify-center">
              <div className="max-w-sm">
                <ErrorRetry error={cities.error} onRetry={() => cities.refetch()} />
              </div>
            </div>
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
              onSelect={(s) => {
                select(s);
                if (!panelOpen) setPanel(true); // show the detail card for what was clicked
              }}
              onBoundsChange={setBbox}
            />
          )}
          {!panelOpen && (
            <button
              onClick={() => setPanel(true)}
              className="absolute right-[72px] top-4 z-10 flex h-11 items-center gap-2.5 rounded-full bg-glass-strong pl-3.5 pr-[18px] text-[13.5px] font-semibold shadow-float backdrop-blur-[22px] transition-colors hover:bg-white"
            >
              <PanelIcon collapsed />
              Show panel
            </button>
          )}
          <div className="pointer-events-none absolute bottom-4 left-4 top-4 z-10 flex flex-col items-start justify-end gap-2">
            {noScores && (
              <div className="pointer-events-auto flex h-10 items-center gap-2.5 rounded-full bg-glass-strong pl-3.5 pr-[18px] text-[13px] font-semibold shadow-float backdrop-blur-[22px]">
                <span className="size-2 rounded-full bg-sun ring-1 ring-sun-deep" />
                No model results loaded for this city.
              </div>
            )}
            {(cells.isError || nearby.isError) && (
              <div className="pointer-events-auto max-w-xs">
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

        {/* side panel: hidden, not unmounted, so a running scenario and its map highlight survive */}
        <aside
          className={`@container ${panelOpen ? "" : "hidden"} min-[700px]:min-h-0 min-[700px]:w-[clamp(340px,34vw,464px)] min-[700px]:flex-none min-[700px]:overflow-y-auto`}
        >
          <div className="flex flex-col gap-3 pb-5 pl-0.5 pr-1 pt-0.5">
            {/* the tab bar stays pinned; the cards below scroll under it */}
            <nav
              className="sticky top-0 z-10 flex flex-none items-center gap-1.5 rounded-full bg-glass-strong p-1.5 shadow-float backdrop-blur-[24px]"
              role="tablist"
            >
              <button
                onClick={() => setPanel(false)}
                aria-label="Hide panel"
                title="Hide panel to see the whole map"
                className="flex size-11 flex-none items-center justify-center rounded-full bg-well text-soft transition-colors hover:bg-rim"
              >
                <PanelIcon />
              </button>
              {TABS.map((t) => {
                const active = tab === t.id;
                const count = counts[t.id];
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setParams({ tab: t.id })}
                    className={`relative flex h-11 flex-1 items-center justify-center gap-2 rounded-full text-[14px] transition-colors ${
                      active ? "font-bold text-white" : "font-semibold text-soft hover:bg-well"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute inset-0 rounded-full bg-charcoal shadow-primary"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{t.name}</span>
                    {count !== undefined && (
                      <span
                        className={`relative z-10 font-mono text-[11px] font-medium ${
                          active ? "inline-flex h-5 min-w-6 items-center justify-center rounded-full bg-sun px-[7px] text-strong" : "text-quiet"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

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

            {tab === "queue" && (
              <QueueTab
                city={city}
                cityName={cityObj?.name ?? city}
                query={tickets}
                filters={filters}
                onFilters={setFilters}
                selectedId={selection?.kind === "ticket" ? selection.id : null}
                onSelect={(t) => select({ kind: "ticket", id: t.id }, t)}
                showSummary={!selection}
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

      <footer className="flex flex-none items-start gap-2.5 rounded-[22px] bg-white/55 px-[18px] py-2 backdrop-blur-[16px]">
        <InfoIcon size={14} className="mt-0.5 flex-none text-quiet" />
        <p className="font-mono text-[11px] leading-[1.55] text-soft">
          Projected changes are model estimates, not measured outcomes. The model target is litter-related complaint
          density, not measured bin overflow. Orlando has no local complaint data: its scores come from a model trained
          on NYC and Chicago and are lightly validated. Rows marked &quot;Demo data&quot; are synthetic.
        </p>
      </footer>
    </div>
  );
}
