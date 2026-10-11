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
import type { RankedCell } from "@/lib/labels";
import type { Bbox, Bin, Cell, City, Recommendation, Ticket } from "@/lib/types";

// public/maplibre-gl-worker.mjs is copied from node_modules on postinstall (see scripts/).
setWorkerUrl("/maplibre-gl-worker.mjs");

const MAP_STYLE = process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";

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
  const [hovering, setHovering] = useState(false);

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
        onHover={(info: PickingInfo) => setHovering(Boolean(info.object))}
      />
    </Map>
  );
}
