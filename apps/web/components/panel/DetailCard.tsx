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
import Thumb from "./Thumb";

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
      className="relative border-b border-zinc-200 bg-white p-3 dark:border-rc-border dark:bg-ink"
      aria-label="Details"
    >
      <button
        onClick={onClose}
        aria-label="Close details"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-lg leading-none text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/[0.06] dark:hover:text-zinc-200"
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
  return <p className="pr-6 text-sm text-zinc-500">{what}</p>;
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-zinc-500">{k}</dt>
      <dd className="text-zinc-900 dark:text-zinc-100">{children}</dd>
    </>
  );
}

function TicketDetail({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pr-6">
        <h2 className="font-semibold">{labelText(ticket.label)}</h2>
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
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-50 hover:border-zinc-400 dark:border-rc-border dark:hover:bg-white/[0.04] dark:hover:border-smoke"
      >
        Open in Street View <span aria-hidden>↗</span>
      </a>
      <p className="mt-1 text-xs text-zinc-500">Google shows the nearest street-level photo, which may be a short distance away or a few years old.</p>
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
            className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-0.5 text-sm dark:border-rc-border dark:bg-obsidian"
          />
          <button className="rounded-md bg-brand px-2 py-0.5 text-xs font-medium text-brand-fg transition-opacity hover:opacity-90">Save</button>
        </div>
        {message && <p className="text-xs text-red-700 dark:text-red-400">{message}</p>}
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
        className="rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-sm transition-colors hover:border-zinc-400 dark:border-rc-border dark:bg-obsidian dark:hover:border-smoke"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_TEXT[s]}
          </option>
        ))}
      </select>
      {patch.isPending && <span className="ml-2 text-xs text-zinc-500">Saving…</span>}
      {message && <p className="text-xs text-red-700 dark:text-red-400">{message}</p>}
    </div>
  );
}

function SiteDetail({ site, underReported }: { site: Recommendation; underReported: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 pr-6">
        <h2 className="font-semibold">Recommended site #{site.rank}</h2>
        {underReported && <UnderReportedBadge />}
      </div>
      <p className="text-sm">{site.rationale || "No reason written yet."}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <Row k="Nearest bin now">{Math.round(site.nearest_bin_m)} m</Row>
        <Row k="Nearby reports">{site.nearby_reports}</Row>
        <Row k="Estimated gain">{site.gain.toFixed(3)}</Row>
      </dl>
      <p className="text-xs text-zinc-500">Gain is a model estimate of how much closer residents get to a bin, weighted by expected demand.</p>
      <StreetViewLink lat={site.lat} lng={site.lng} />
    </div>
  );
}

function CellDetail({ cell, ratesLoaded }: { cell: RankedCell; ratesLoaded: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 pr-6">
        <h2 className="font-semibold">Area {cell.h3_cell}</h2>
        {cell.under_reported && <UnderReportedBadge />}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <Row k="Expected overflow">
          {riskText(cell.risk_rank)} · score {cell.expected_overflow.toFixed(2)}
        </Row>
        <Row k="Reports per 1,000 residents">{cell.reports_per_1k == null ? "not loaded yet" : cell.reports_per_1k.toFixed(2)}</Row>
        <Row k="Demand weight">{cell.demand.toFixed(2)}</Row>
      </dl>
      <p className="text-xs text-zinc-500">
        {!cell.under_reported
          ? "Expected overflow is a model estimate from places, transit, parks, population and existing bins."
          : ratesLoaded
            ? "The model expects a lot of overflow here, but residents report little of it. Reports alone would miss this area."
            : "Flagged under-reported by the data pipeline. Reports per 1,000 residents are not loaded yet, so this is not yet checked against reporting rates."}
      </p>
    </div>
  );
}
