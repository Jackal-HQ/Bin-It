"use client";

import { useEffect, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { TicketFilters } from "@/lib/api";
import {
  LABEL_OPTIONS,
  STATUS_OPTIONS,
  STATUS_TEXT,
  labelText,
  rgb,
  severityColor,
  severityText,
  timeAgo,
} from "@/lib/labels";
import type { Label, Status, Ticket } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import { DemoBadge, Empty, ErrorRetry, Loading } from "./States";
import Thumb from "./Thumb";

type Props = {
  city: string;
  query: UseQueryResult<Ticket[]>;
  filters: TicketFilters;
  onFilters: (f: TicketFilters) => void;
  selectedId: string | null;
  onSelect: (t: Ticket) => void;
};

/** Ids that appeared since the previous poll, highlighted for a few seconds. */
function useNewIds(city: string, tickets: Ticket[] | undefined) {
  const seen = useRef<{ city: string; ids: Set<string> } | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!tickets) return;
    const ids = new Set(tickets.map((t) => t.id));
    const prev = seen.current;
    seen.current = { city, ids };
    if (!prev || prev.city !== city) return; // first load for this city: nothing is "new"
    const added = [...ids].filter((id) => !prev.ids.has(id));
    if (added.length === 0) return;
    setFresh(new Set(added));
    const timer = setTimeout(() => setFresh(new Set()), 3000);
    return () => clearTimeout(timer);
  }, [city, tickets]);

  return fresh;
}

const selectClass =
  "rounded-[8px] border border-rc-border bg-obsidian px-2.5 py-1 text-[13px] text-white transition-colors hover:border-smoke focus-visible:outline focus-visible:outline-1 focus-visible:outline-mist";

const th = "font-mono text-[10px] font-medium uppercase tracking-[0.073em]";

export default function QueueTab({ city, query, filters, onFilters, selectedId, onSelect }: Props) {
  const fresh = useNewIds(city, query.data);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-rc-border p-3">
        <select
          aria-label="Filter by label"
          className={selectClass}
          value={filters.label ?? ""}
          onChange={(e) => onFilters({ ...filters, label: (e.target.value || undefined) as Label | undefined })}
        >
          <option value="">All labels</option>
          {LABEL_OPTIONS.map((l) => (
            <option key={l} value={l}>
              {labelText(l)}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className={selectClass}
          value={filters.status ?? ""}
          onChange={(e) => onFilters({ ...filters, status: (e.target.value || undefined) as Status | undefined })}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_TEXT[s]}
            </option>
          ))}
        </select>
        <span className="ml-auto font-mono text-[11px] text-smoke">
          {query.data ? `${query.data.length} tickets` : ""} · updates every 5 s
        </span>
      </div>

      {query.isPending ? (
        <Loading what="tickets" />
      ) : query.isError ? (
        <ErrorRetry error={query.error} onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <Empty>No tickets match these filters.</Empty>
      ) : (
        <table className="w-full text-left text-[13px]">
          <thead className="bg-obsidian text-smoke">
            <tr>
              <th className={`py-2 pl-3 pr-1 ${th}`}>
                <Tooltip content="Highest severity among the reports merged into the ticket, from Low to High.">
                  <span>Severity</span>
                </Tooltip>
              </th>
              <th className={`px-2 py-2 ${th}`}>Label</th>
              <th className={`px-1 py-2 text-right ${th}`}>
                <Tooltip content="Reports merged into this ticket: same place, within 50 m and seven days, with a similar photo.">
                  <span>Count</span>
                </Tooltip>
              </th>
              <th className={`px-2 py-2 ${th}`}>Status</th>
              <th className={`hidden px-2 py-2 @[420px]:table-cell ${th}`}>Last seen</th>
              <th className="py-2 pl-1 pr-3">
                <span className="sr-only">Photo</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((t) => (
              <tr
                key={t.id}
                onClick={() => onSelect(t)}
                className={`cursor-pointer border-t border-rc-border/60 transition-colors duration-200 hover:bg-white/[0.04] ${
                  t.id === selectedId ? "bg-coral-pulse/10 shadow-[inset_2px_0_0_0_var(--color-coral-pulse)]" : ""
                } ${fresh.has(t.id) ? "bg-white/[0.08]" : ""}`}
              >
                <td className="py-2 pl-3 pr-1">
                  <span className="flex items-center gap-1.5 text-white">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: rgb(severityColor(t.max_severity)) }}
                    />
                    {severityText(t.max_severity)}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <div className="text-white">{labelText(t.label)}</div>
                  {t.is_synthetic && <DemoBadge />}
                </td>
                <td className="px-1 py-2 text-right tabular-nums text-white">{t.report_count}</td>
                <td className="px-2 py-2 text-ash">{STATUS_TEXT[t.status] ?? t.status}</td>
                <td className="hidden whitespace-nowrap px-2 py-2 text-smoke @[420px]:table-cell">
                  {timeAgo(t.last_seen)}
                </td>
                <td className="py-1.5 pl-1 pr-3">
                  <Thumb src={t.photo_url} className="h-9 w-9" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
