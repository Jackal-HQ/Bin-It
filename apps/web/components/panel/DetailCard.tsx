"use client";

// One card for whatever is selected on the map or in a list: a ticket, a recommended site
// or an H3 cell. Only tickets have a photo and a status control.
import { useState } from "react";
import { motion } from "motion/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, cachedMode } from "@/lib/api";
import { setStaffKey, useStaffKey } from "@/lib/hooks";
import {
  STATUS_OPTIONS,
  STATUS_TEXT,
  formatDateTime,
  labelText,
  riskText,
  severityText,
  streetViewUrl,
  type RankedCell,
} from "@/lib/labels";
import type { Selection } from "@/lib/selection";
import type { Recommendation, Status, Ticket } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import { cn } from "@/lib/utils";
import { CloseIcon, ExternalIcon, MergeIcon } from "@/components/dash/icons";
import { Led, Segmented, btnPrimary, btnSecondary, eyebrow, inputPill, tile, tileLabel } from "@/components/dash/ui";
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
      className="flex-none rounded-card bg-glass-strong p-3.5 shadow-card backdrop-blur-[24px]"
      aria-label="Details"
    >
      {selection.kind === "ticket" ? (
        ticket ? (
          <TicketDetail ticket={ticket} onClose={onClose} />
        ) : (
          <Missing what="This ticket is not in the current queue or map view." onClose={onClose} />
        )
      ) : selection.kind === "site" ? (
        site ? (
          <SiteDetail site={site} underReported={siteUnderReported} onClose={onClose} />
        ) : (
          <Missing what="This site is not in the current recommendations." onClose={onClose} />
        )
      ) : cell ? (
        <CellDetail cell={cell} ratesLoaded={ratesLoaded} onClose={onClose} />
      ) : (
        <Missing what="No model results for this area." onClose={onClose} />
      )}
    </motion.section>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      aria-label="Close details"
      className="flex size-[38px] flex-none items-center justify-center rounded-full border border-rim text-soft transition-colors hover:bg-well"
    >
      <CloseIcon size={14} />
    </button>
  );
}

/** Eyebrow, title (+ badge) and the close button. `lead` is an optional disc before the title. */
function Header({
  eyebrowText,
  title,
  badge,
  lead,
  onClose,
}: {
  eyebrowText: string;
  title: string;
  badge?: React.ReactNode;
  lead?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pb-3 pl-1.5 pr-0.5 pt-0.5">
      {lead}
      <div className="min-w-0 flex-1">
        <div className={eyebrow}>{eyebrowText}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <h2 className="text-[21px] font-extrabold leading-[1.15] tracking-[-0.01em]">{title}</h2>
          {badge}
        </div>
      </div>
      <CloseButton onClose={onClose} />
    </div>
  );
}

function Missing({ what, onClose }: { what: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3 px-1.5 py-1">
      <p className="flex-1 text-[14px] text-soft">{what}</p>
      <CloseButton onClose={onClose} />
    </div>
  );
}

function Tile({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`${tile} ${className}`}>
      <div className={tileLabel}>{hint ? <Tooltip content={hint}><span>{label}</span></Tooltip> : label}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TicketDetail({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const chip =
    "absolute bottom-3 inline-flex h-[30px] items-center gap-2 rounded-full bg-strong/65 px-3 text-[12.5px] font-semibold text-white backdrop-blur-[10px]";
  return (
    <div>
      <Header
        eyebrowText="Ticket"
        title={labelText(ticket.label)}
        badge={ticket.is_synthetic ? <DemoBadge /> : undefined}
        onClose={onClose}
      />
      <Thumb
        src={ticket.photo_url}
        alt={`Photo: ${labelText(ticket.label)}`}
        className="h-40 w-full rounded-notice"
        emptyText="No photo stored for this ticket"
        iconSize={56}
      >
        <span className={`${chip} left-3`}>
          <MergeIcon size={16} />
          {ticket.report_count} {ticket.report_count === 1 ? "report" : "reports merged"}
        </span>
        <span className={`${chip} right-3`}>
          <Led severity={ticket.max_severity} onDark />
          {severityText(ticket.max_severity)}
        </span>
      </Thumb>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Tile label="Severity">
          <div className="flex items-center gap-2 text-[15px] font-bold">
            <Led severity={ticket.max_severity} size={10} />
            {severityText(ticket.max_severity)}
            <span className="text-[12.5px] font-medium text-quiet">{ticket.max_severity} of 3</span>
          </div>
        </Tile>
        <Tile label="Reports">
          <div className="flex items-baseline gap-2">
            <span className="dot-num text-[30px]">{ticket.report_count}</span>
            <span className="text-[12.5px] font-medium text-quiet">merged</span>
          </div>
        </Tile>
        <Tile label="First seen">
          <div className="text-[14px] font-bold">{formatDateTime(ticket.first_seen)}</div>
        </Tile>
        <Tile label="Last seen">
          <div className="text-[14px] font-bold">{formatDateTime(ticket.last_seen)}</div>
        </Tile>
      </div>

      <div className={`${tile} mt-2 px-3.5 pb-3.5`}>
        <div className={tileLabel}>Status</div>
        <div className="mt-2.5">
          <StatusControl ticket={ticket} />
        </div>
      </div>

      <StreetViewLink lat={ticket.lat} lng={ticket.lng} />
    </div>
  );
}

/** Opens Google Street View at the point in a new tab (plain Maps URL, no API key). */
function StreetViewLink({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 px-1 pb-0.5">
      <a
        href={streetViewUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(btnSecondary, "px-4")}
      >
        Open in Street View <ExternalIcon size={14} />
      </a>
      <span className="min-w-[180px] flex-1 text-xs leading-[1.5] text-quiet">
        Google shows the nearest street-level photo, which may be a short distance away or a few years old.
      </span>
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
  if (cachedMode) return <span className="text-[14px] font-semibold">{current} (read-only in cached-data mode)</span>;

  const note = message && (
    <p className="mt-2 flex items-center gap-2 px-1 text-[12.5px] font-semibold text-coral-ink">
      <span className="size-[7px] flex-none rounded-full bg-coral-pulse" />
      {message}
    </p>
  );

  if (!key) {
    return (
      <div>
        <p className="mb-2 px-1 text-[14px] font-semibold">{current}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draftKey.trim()) setStaffKey(draftKey.trim());
            setDraftKey("");
          }}
        >
          <input
            type="password"
            value={draftKey}
            onChange={(e) => setDraftKey(e.target.value)}
            placeholder="Staff key to change status"
            aria-label="Staff key"
            className={`${inputPill} flex-1 ${message ? "border-coral-pulse" : ""}`}
          />
          <button className={cn(btnPrimary, "h-11 px-5 text-[14px]")}>Save</button>
        </form>
        {note}
      </div>
    );
  }

  return (
    <div>
      <Segmented
        track
        label="Ticket status"
        options={STATUS_OPTIONS.map((s) => ({ id: s, name: STATUS_TEXT[s] }))}
        value={patch.isPending ? (patch.variables as Status) : ticket.status}
        disabled={patch.isPending}
        onChange={(s) => s !== ticket.status && patch.mutate(s as Status)}
      />
      {patch.isPending && <p className="mt-2 px-1 text-xs text-quiet">Saving…</p>}
      {note}
    </div>
  );
}

function SiteDetail({ site, underReported, onClose }: { site: Recommendation; underReported: boolean; onClose: () => void }) {
  return (
    <div>
      <Header
        eyebrowText="Recommended site"
        title={`Site #${site.rank}`}
        badge={underReported ? <UnderReportedBadge /> : undefined}
        lead={
          <span className="flex size-11 flex-none items-center justify-center rounded-full border-[2.5px] border-[#166534] bg-white font-mono text-base font-medium text-[#166534]">
            {site.rank}
          </span>
        }
        onClose={onClose}
      />
      <p className="mx-1 text-[14px] font-medium leading-[1.55]">{site.rationale || "No reason written yet."}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tile label="Nearest bin now" hint="Distance from this site to the closest existing bin (OpenStreetMap or city data).">
          <div className="flex items-baseline gap-1">
            <span className="dot-num text-[28px]">{Math.round(site.nearest_bin_m)}</span>
            <span className="text-[12.5px] font-semibold text-soft">m</span>
          </div>
        </Tile>
        <Tile label="Nearby reports" hint="Resident reports close to this site. Zero is common where residents report little.">
          <span className="dot-num text-[28px]">{site.nearby_reports}</span>
        </Tile>
        <Tile
          label="Estimated gain"
          hint="A model estimate of how much closer residents get to a bin, weighted by expected demand. Not a measured outcome."
        >
          <span className="dot-num text-[28px]">{site.gain.toFixed(3)}</span>
        </Tile>
      </div>
      <p className="mx-1 mt-3 text-xs leading-[1.5] text-quiet">
        Gain is a model estimate of how much closer residents get to a bin, weighted by expected demand.
      </p>
      <StreetViewLink lat={site.lat} lng={site.lng} />
    </div>
  );
}

function CellDetail({ cell, ratesLoaded, onClose }: { cell: RankedCell; ratesLoaded: boolean; onClose: () => void }) {
  return (
    <div>
      <Header
        eyebrowText="Area"
        title={cell.h3_cell}
        badge={cell.under_reported ? <UnderReportedBadge /> : undefined}
        onClose={onClose}
      />
      <div className="grid grid-cols-2 gap-2">
        <Tile
          label="Expected overflow"
          hint="Model score for how much litter this area should produce, ranked within the city."
          className="col-span-2"
        >
          <div className="text-[14px] font-bold">
            {riskText(cell.risk_rank)} · score {cell.expected_overflow.toFixed(2)}
          </div>
        </Tile>
        <Tile
          label="Reports per 1,000"
          hint="How often residents report here, scaled by population. Compared with expected overflow to find under-reported areas."
        >
          <div className="text-[14px] font-bold">
            {cell.reports_per_1k == null ? "not loaded yet" : cell.reports_per_1k.toFixed(2)}
          </div>
        </Tile>
        <Tile label="Demand weight" hint="How much this area counts when measuring distance to the nearest bin.">
          <div className="text-[14px] font-bold">{cell.demand.toFixed(2)}</div>
        </Tile>
      </div>
      <p className="mx-1 mt-3 text-xs leading-[1.5] text-quiet">
        {!cell.under_reported
          ? "Expected overflow is a model estimate from places, transit, parks, population and existing bins."
          : ratesLoaded
            ? "The model expects a lot of overflow here, but residents report little of it. Reports alone would miss this area."
            : "Flagged under-reported by the data pipeline. Reports per 1,000 residents are not loaded yet, so this is not yet checked against reporting rates."}
      </p>
    </div>
  );
}
