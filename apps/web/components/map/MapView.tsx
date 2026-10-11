"use client";

// MapLibre basemap (keyless OpenFreeMap style by default) with a deck.gl overlay.
// Client-only: loaded with next/dynamic({ ssr: false }) from the dashboard.
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, { NavigationControl, useControl, type MapRef } from "react-map-gl/maplibre";
import { setWorkerUrl } from "maplibre-gl";
import { MapboxOverlay, type MapboxOverlayProps } from "@deck.gl/mapbox";
import type { PickingInfo } from "@deck.gl/core";
import { buildLayers, toCellShapes, type CellShape } from "./layers";
import type { LayerToggles, Selection } from "@/lib/selection";
import { labelText, riskText, severityText, type RankedCell } from "@/lib/labels";
import type { Bbox, Bin, Cell, City, Recommendation, Ticket } from "@/lib/types";

// public/maplibre-gl-worker.mjs is copied from node_modules on postinstall (see scripts/).
setWorkerUrl("/maplibre-gl-worker.mjs");

// Default: OpenFreeMap Positron (keyless), inverted to a dark map with CSS (see globals.css).
// A custom NEXT_PUBLIC_MAP_STYLE_URL is used as is and assumed to be dark already.
const CUSTOM_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
const MAP_STYLE = CUSTOM_STYLE || "https://tiles.openfreemap.org/styles/positron";

/** What the hover card shows for the object under the pointer (same look as the Tooltip card). */
function hoverText(layerId: string | undefined, o: unknown): { title: string; body: string } | null {
  if (!o || !layerId) return null;
  if (layerId === "pins") {
    const t = o as Ticket;
    return {
      title: labelText(t.label),
      body: `${severityText(t.max_severity)} severity · ${t.report_count} report${t.report_count === 1 ? "" : "s"}${t.is_synthetic ? " · demo data" : ""}`,
    };
  }
  if (layerId === "sites") {
    const r = o as Recommendation;
    return {
      title: `Recommended site #${r.rank}`,
      body: `${Math.round(r.nearest_bin_m)} m to nearest bin · ${r.nearby_reports} nearby reports`,
    };
  }
  if (layerId === "risk" || layerId === "under") {
    const c = o as RankedCell;
    return {
      title: c.under_reported ? "Under-reported area" : "Area",
      body: `Expected overflow: ${riskText(c.risk_rank)}`,
    };
  }
  return null;
}

export type FlyTarget = { lat: number; lng: number; zoom: number; key: string | number };

function DeckOverlay(props: MapboxOverlayProps) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

type Props = {
  city: City;
  flyTo: FlyTarget | null;
  cells: RankedCell[];
  tickets: Ticket[];
  bins: Bin[];
  sites: Recommendation[];
  scenarioActive: boolean;
  layers: LayerToggles;
  selection: Selection | null;
  onSelect: (s: Selection) => void;
  onBoundsChange: (bbox: Bbox) => void;
};

const round = (n: number) => Math.round(n * 1000) / 1000;

export default function MapView(props: Props) {
  const { city, flyTo, cells, onSelect, onBoundsChange } = props;
  const mapRef = useRef<MapRef>(null);
  const [hover, setHover] = useState<{ x: number; y: number; title: string; body: string } | null>(null);
  const hovering = hover !== null;

  const shapes = useMemo<CellShape[]>(() => toCellShapes(cells), [cells]);
  const layers = useMemo(
    () =>
      buildLayers({
        cells: shapes,
        tickets: props.tickets,
        bins: props.bins,
        sites: props.sites,
        scenarioActive: props.scenarioActive,
        layers: props.layers,
        selection: props.selection,
      }),
    [shapes, props.tickets, props.bins, props.sites, props.scenarioActive, props.layers, props.selection],
  );

  // Changing city re-centers the map (center, never a bbox test: the bboxes are rough).
  // The first city comes from initialViewState; only later changes fly.
  const { lat: cityLat, lng: cityLng } = city.center;
  const shownCity = useRef(city.slug);
  useEffect(() => {
    if (shownCity.current === city.slug) return;
    shownCity.current = city.slug;
    mapRef.current?.flyTo({ center: [cityLng, cityLat], zoom: 13, duration: 1200 });
  }, [city.slug, cityLat, cityLng]);

  useEffect(() => {
    if (flyTo) mapRef.current?.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: flyTo.zoom, duration: 1200 });
  }, [flyTo]);

  function reportBounds() {
    const b = mapRef.current?.getBounds();
    if (b) onBoundsChange([round(b.getWest()), round(b.getSouth()), round(b.getEast()), round(b.getNorth())]);
  }

  function handleClick(info: PickingInfo) {
    const id = info.layer?.id;
    const o = info.object;
    if (!o || !id) return;
    if (id === "pins") onSelect({ kind: "ticket", id: (o as Ticket).id });
    else if (id === "sites") onSelect({ kind: "site", rank: (o as Recommendation).rank });
    else if (id === "risk" || id === "under") onSelect({ kind: "cell", h3: (o as Cell).h3_cell });
  }

  return (
    <div className={`bin-map relative h-full w-full ${CUSTOM_STYLE ? "" : "bin-map-dark"}`}>
      <Map
        ref={mapRef}
        initialViewState={{ longitude: city.center.lng, latitude: city.center.lat, zoom: 13 }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        cursor={hovering ? "pointer" : "grab"}
        onLoad={reportBounds}
        onMoveEnd={reportBounds}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <DeckOverlay
          layers={layers}
          onClick={handleClick}
          onHover={(info: PickingInfo) => {
            const text = hoverText(info.layer?.id, info.object);
            setHover(text ? { x: info.x, y: info.y, ...text } : null);
          }}
        />
      </Map>
      {hover && (
        <div
          className="pointer-events-none absolute z-20 max-w-[240px] rounded-[12px] border border-rc-border bg-ink px-3 py-2 text-[13px] leading-[1.5] text-ash"
          style={{ left: Math.min(hover.x + 14, 9999), top: hover.y + 14 }}
        >
          <span className="block font-medium text-white">{hover.title}</span>
          <span className="block">{hover.body}</span>
        </div>
      )}
    </div>
  );
}
