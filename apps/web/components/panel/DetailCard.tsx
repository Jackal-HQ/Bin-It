"use client";

// One card for whatever is selected on the map or in a list: a ticket, a recommended site
// or an H3 cell. Only tickets have a photo and a status control.
import { useState } from "react";
import { motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, cachedMode } from "@/lib/api";
import { setStaffKey, useStaffKey } from "@/lib/hooks";
import { STATUS_OPTIONS, STATUS_TEXT, formatDateTime, labelText, riskText, severityText, streetViewUrl, type RankedCell } from "@/lib/labels";
import type { Selection } from "@/lib/selection";
import type { Recommendation, Status, Ticket } from "@/lib/types";
import { DemoBadge, UnderReportedBadge, isUnauthorized } from "./States";
import { Tooltip } from "@/components/ui/tooltip-card";
import Thumb from "./Thumb";

const KEY_SHADOW =
  "rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset";

type Props = {
  selection: Selection;
  ticket: Ticket | undefined;
  site: Recommendation | undefined;
  cell: RankedCell | undefined;
  siteUnderReported: boolean;
  ratesLoaded: boolean;
  onClose: () => void;
};

export default function DetailCard({ selection, ticket, site, cell, siteUnderReported, ratesLoaded, onClose }: Props) {
  const selKey =
    selection.kind === "ticket" ? selection.id : selection.kind === "site" ? `site-${selection.rank}` : `cell-${selection.h3}`;
  return (
    <motion.section
      key={selKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="relative m-3 rounded-[16px] bg-ink/60 p-4"
      style={{ boxShadow: KEY_SHADOW }}
      aria-label="Details"
    >
      <button
        onClick={onClose}
        aria-label="Close details"
        className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-[6px] text-lg leading-none text-smoke transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        ×
      </button>
      {selection.kind === "ticket" ? (
        ticket ? <TicketDetail ticket={ticket} /> : <Missing what="This ticket is not in the current queue or map view." />
      ) : selection.kind === "site" ? (
        site ? <SiteDetail site={site} underReported={siteUnderReported} /> : <Missing what="This site is not in the current recommendations." />
      ) : cell ? (
        <CellDetail cell={cell} ratesLoaded={ratesLoaded} />
      ) : (
        <Missing what="No model results for this area." />
      )}
    </motion.section>
  );
}

function Missing({ what }: { what: string }) {
  return <p className="pr-6 text-sm text-ash">{what}</p>;
}

function Row({ k, hint, children }: { k: string; hint?: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-smoke">{hint ? <Tooltip content={hint}><span>{k}</span></Tooltip> : k}</dt>
      <dd className="text-white">{children}</dd>
    </>
  );
}

function TicketDetail({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pr-6">
        <h2 className="text-[16px] font-medium text-white">{labelText(ticket.label)}</h2>
        {ticket.is_synthetic && <DemoBadge />}
      </div>
      <Thumb src={ticket.photo_url} alt={`Photo: ${labelText(ticket.label)}`} className="h-48 w-full" emptyText="No photo stored for this ticket" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <Row k="Severity">
          {severityText(ticket.max_severity)} ({ticket.max_severity} of 3)
        </Row>
        <Row k="Reports">{ticket.report_count}</Row>
        <Row k="First seen">{formatDateTime(ticket.first_seen)}</Row>
        <Row k="Last seen">{formatDateTime(ticket.last_seen)}</Row>
        <Row k="Status">
          <StatusControl ticket={ticket} />
        </Row>
      </dl>
      <StreetViewLink lat={ticket.lat} lng={ticket.lng} />
    </div>
  );
}

/** Opens Google Street View at the point in a new tab (plain Maps URL, no API key). */
function StreetViewLink({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div>
      <a
        href={streetViewUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-[8px] border border-rc-border px-3 py-1.5 text-[13px] font-medium text-ash transition-colors hover:text-white"
      >
        Open in Street View <span aria-hidden>↗</span>
      </a>
      <p className="mt-1 text-xs text-smoke">Google shows the nearest street-level photo, which may be a short distance away or a few years old.</p>
    </div>
  );
}

function StatusControl({ ticket }: { ticket: Ticket }) {
  const key = useStaffKey();
  const queryClient = useQueryClient();
  const [draftKey, setDraftKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const patch = useMutation({
    mutationFn: (status: Status) => api.patchTicket(ticket.id, status, key ?? ""),
    onSuccess: () => {
      setMessage(null);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["nearby"] });
    },
    onError: (e) => {
      if (isUnauthorized(e)) {
        setStaffKey(null);
        setMessage("Staff key not accepted. Enter it again.");
      } else {
        setMessage(e instanceof Error ? e.message : "Status change failed.");
      }
    },
  });

  const current = STATUS_TEXT[ticket.status] ?? ticket.status;
  if (cachedMode) return <span>{current} (read-only in cached-data mode)</span>;

  if (!key) {
    return (
      <form
        className="space-y-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (draftKey.trim()) setStaffKey(draftKey.trim());
          setDraftKey("");
        }}
      >
        <span>{current}</span>
        <div className="flex gap-1">
          <input
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="Staff key to change status"
            aria-label="Staff key"
            className="min-w-0 flex-1 rounded-[8px] border border-rc-border bg-obsidian px-2 py-1 text-sm text-white placeholder:text-smoke focus-visible:outline focus-visible:outline-1 focus-visible:outline-mist"
          />
          <button className="rounded-[8px] bg-mist px-2.5 py-1 text-xs font-medium text-iron transition-opacity hover:opacity-90">Save</button>
        </div>
        {message && <p className="text-xs text-coral-pulse">{message}</p>}
      </form>
    );
  }

  return (
    <div className="space-y-1">
      <select
        aria-label="Ticket status"
        value={patch.isPending ? patch.variables : ticket.status}
        disabled={patch.isPending}
        onChange={(e) => patch.mutate(e.target.value as Status)}
        className="rounded-[8px] border border-rc-border bg-obsidian px-2 py-1 text-sm text-white transition-colors hover:border-smoke focus-visible:outline focus-visible:outline-1 focus-visible:outline-mist"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_TEXT[s]}
          </option>
        ))}
      </select>
      {patch.isPending && <span className="ml-2 text-xs text-smoke">Saving…</span>}
      {message && <p className="text-xs text-coral-pulse">{message}</p>}
    </div>
  );
}

function SiteDetail({ site, underReported }: { site: Recommendation; underReported: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 pr-6">
        <h2 className="text-[16px] font-medium text-white">Recommended site #{site.rank}</h2>
        {underReported && <UnderReportedBadge />}
      </div>
      <p className="text-[13px] leading-[1.5] text-white">{site.rationale || "No reason written yet."}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <Row k="Nearest bin now" hint="Distance from this site to the closest existing bin (OpenStreetMap or city data).">{Math.round(site.nearest_bin_m)} m</Row>
        <Row k="Nearby reports" hint="Resident reports close to this site. Zero is common where residents report little.">{site.nearby_reports}</Row>
        <Row k="Estimated gain" hint="A model estimate of how much closer residents get to a bin, weighted by expected demand. Not a measured outcome.">{site.gain.toFixed(3)}</Row>
      </dl>
      <p className="text-xs text-smoke">Gain is a model estimate of how much closer residents get to a bin, weighted by expected demand.</p>
      <StreetViewLink lat={site.lat} lng={site.lng} />
    </div>
  );
}

function CellDetail({ cell, ratesLoaded }: { cell: RankedCell; ratesLoaded: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 pr-6">
        <h2 className="text-[16px] font-medium text-white">Area {cell.h3_cell}</h2>
        {cell.under_reported && <UnderReportedBadge />}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <Row k="Expected overflow" hint="Model score for how much litter this area should produce, ranked within the city.">
          {riskText(cell.risk_rank)} · score {cell.expected_overflow.toFixed(2)}
        </Row>
        <Row k="Reports per 1,000 residents" hint="How often residents report here, scaled by population. Compared with expected overflow to find under-reported areas.">{cell.reports_per_1k == null ? "not loaded yet" : cell.reports_per_1k.toFixed(2)}</Row>
        <Row k="Demand weight" hint="How much this area counts when measuring distance to the nearest bin.">{cell.demand.toFixed(2)}</Row>
      </dl>
      <p className="text-xs text-smoke">
        {!cell.under_reported
          ? "Expected overflow is a model estimate from places, transit, parks, population and existing bins."
          : ratesLoaded
            ? "The model expects a lot of overflow here, but residents report little of it. Reports alone would miss this area."
            : "Flagged under-reported by the data pipeline. Reports per 1,000 residents are not loaded yet, so this is not yet checked against reporting rates."}
      </p>
    </div>
  );
}
