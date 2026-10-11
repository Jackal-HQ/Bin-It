// deck.gl layers for the dashboard map. Hexes are drawn with PolygonLayer + h3-js
// cellToBoundary: @deck.gl/geo-layers (H3HexagonLayer) pulls a broken @loaders.gl release.
import { PolygonLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import type { Layer } from "@deck.gl/core";
import { cellToBoundary } from "h3-js";
import {
  BIN_COLOR,
  type RankedCell,
  SITE_COLOR,
  UNDER_REPORTED_COLOR,
  riskColor,
  severityColor,
  severityRadius,
} from "@/lib/labels";
import type { LayerToggles, Selection } from "@/lib/selection";
import type { Bin, Recommendation, Ticket } from "@/lib/types";

export type CellShape = RankedCell & { polygon: [number, number][] };

/** Precompute hex outlines (lng, lat order) once per cells payload. */
export function toCellShapes(cells: RankedCell[]): CellShape[] {
  return cells.map((c) => ({ ...c, polygon: cellToBoundary(c.h3_cell, true) as [number, number][] }));
}

type Input = {
  cells: CellShape[];
  tickets: Ticket[];
  bins: Bin[];
  sites: Recommendation[];
  scenarioActive: boolean;
  layers: LayerToggles;
  selection: Selection | null;
};

export function buildLayers({ cells, tickets, bins, sites, scenarioActive, layers, selection }: Input): Layer[] {
  const out: Layer[] = [];

  if (layers.risk) {
    out.push(
      new PolygonLayer<CellShape>({
        id: "risk",
        data: cells,
        getPolygon: (d) => d.polygon,
        getFillColor: (d) => [...riskColor(d.risk_rank), 150],
        stroked: false,
        pickable: true,
      }),
    );
  }

  if (layers.under) {
    out.push(
      new PolygonLayer<CellShape>({
        id: "under",
        data: cells.filter((c) => c.under_reported),
        getPolygon: (d) => d.polygon,
        filled: true,
        getFillColor: [0, 0, 0, 0],
        getLineColor: [...UNDER_REPORTED_COLOR, 220],
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        pickable: true,
      }),
    );
  }

  if (layers.bins) {
    out.push(
      new ScatterplotLayer<Bin>({
        id: "bins",
        data: bins,
        getPosition: (d) => [d.lng, d.lat],
        radiusUnits: "pixels",
        getRadius: 4,
        getFillColor: BIN_COLOR,
        stroked: true,
        getLineColor: [255, 255, 255],
        lineWidthUnits: "pixels",
        getLineWidth: 1,
      }),
    );
  }

  if (layers.pins) {
    out.push(
      new ScatterplotLayer<Ticket>({
        id: "pins",
        data: tickets,
        getPosition: (d) => [d.lng, d.lat],
        radiusUnits: "pixels",
        getRadius: (d) => severityRadius(d.max_severity),
        getFillColor: (d) => severityColor(d.max_severity),
        stroked: true,
        // demo data: dark ring; real reports: white ring (explained in the legend)
        getLineColor: (d) => (d.is_synthetic ? [17, 24, 39] : [255, 255, 255]),
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        pickable: true,
        updateTriggers: { getLineColor: tickets },
      }),
      new TextLayer<Ticket>({
        id: "pin-count",
        data: tickets.filter((t) => t.report_count > 1),
        getPosition: (d) => [d.lng, d.lat],
        getText: (d) => String(d.report_count),
        getSize: 11,
        getColor: [255, 255, 255],
        fontWeight: 700,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
      }),
    );
  }

  if (layers.sites) {
    out.push(
      new ScatterplotLayer<Recommendation>({
        id: "sites",
        data: sites,
        getPosition: (d) => [d.lng, d.lat],
        radiusUnits: "pixels",
        getRadius: 11,
        getFillColor: scenarioActive ? SITE_COLOR : [255, 255, 255],
        stroked: true,
        getLineColor: SITE_COLOR,
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        pickable: true,
        updateTriggers: { getFillColor: scenarioActive },
      }),
      new TextLayer<Recommendation>({
        id: "site-rank",
        data: sites,
        getPosition: (d) => [d.lng, d.lat],
        getText: (d) => String(d.rank),
        getSize: 11,
        getColor: scenarioActive ? [255, 255, 255] : SITE_COLOR,
        fontWeight: 700,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        updateTriggers: { getColor: scenarioActive },
      }),
    );
  }

  // ring around whatever the detail card shows
  if (selection?.kind === "cell") {
    const cell = cells.find((c) => c.h3_cell === selection.h3);
    if (cell) {
      out.push(
        new PolygonLayer<CellShape>({
          id: "selection",
          data: [cell],
          getPolygon: (d) => d.polygon,
          filled: false,
          getLineColor: [17, 24, 39],
          lineWidthUnits: "pixels",
          getLineWidth: 3,
        }),
      );
    }
  } else if (selection) {
    const point =
      selection.kind === "ticket"
        ? tickets.find((t) => t.id === selection.id)
        : sites.find((s) => s.rank === selection.rank);
    if (point) {
      out.push(
        new ScatterplotLayer<{ lat: number; lng: number }>({
          id: "selection",
          data: [point],
          getPosition: (d) => [d.lng, d.lat],
          radiusUnits: "pixels",
          getRadius: 18,
          filled: false,
          stroked: true,
          getLineColor: [17, 24, 39],
          lineWidthUnits: "pixels",
          getLineWidth: 3,
        }),
      );
    }
  }

  return out;
}
