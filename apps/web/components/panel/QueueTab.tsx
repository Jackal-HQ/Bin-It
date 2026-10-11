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
  "rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export default function QueueTab({ city, query, filters, onFilters, selectedId, onSelect }: Props) {
  const fresh = useNewIds(city, query.data);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
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
        <span className="ml-auto text-xs text-zinc-500">
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
          <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="py-2 pl-3 pr-1 font-medium">Severity</th>
              <th className="px-2 py-2 font-medium">Label</th>
              <th className="px-1 py-2 text-right font-medium">Count</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="hidden px-2 py-2 font-medium sm:table-cell">Last seen</th>
              <th className="py-2 pl-1 pr-3 font-medium"><span className="sr-only">Photo</span></th>
            </tr>
          </thead>
          <tbody>
            {query.data.map((t) => (
              <tr
                key={t.id}
                onClick={() => onSelect(t)}
                className={`cursor-pointer border-t border-zinc-100 transition-colors duration-700 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 ${
                  t.id === selectedId ? "bg-green-50 dark:bg-green-950" : ""
                } ${fresh.has(t.id) ? "bg-yellow-100 dark:bg-yellow-900" : ""}`}
              >
                <td className="py-2 pl-3 pr-1">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: rgb(severityColor(t.max_severity)) }} />
                    {severityText(t.max_severity)}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <div>{labelText(t.label)}</div>
                  {t.is_synthetic && <DemoBadge />}
                </td>
                <td className="px-1 py-2 text-right tabular-nums">{t.report_count}</td>
                <td className="px-2 py-2">{STATUS_TEXT[t.status] ?? t.status}</td>
                <td className="hidden px-2 py-2 whitespace-nowrap text-zinc-500 sm:table-cell">{timeAgo(t.last_seen)}</td>
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
