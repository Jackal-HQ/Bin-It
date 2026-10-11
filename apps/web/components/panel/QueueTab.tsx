"use client";

import { useEffect, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { TicketFilters } from "@/lib/api";
import { LABEL_OPTIONS, STATUS_OPTIONS, STATUS_TEXT, labelText, severityText, timeAgo } from "@/lib/labels";
import type { Label, Status, Ticket } from "@/lib/types";
import { Tooltip } from "@/components/ui/tooltip-card";
import { cn } from "@/lib/utils";
import { ChevronIcon } from "@/components/dash/icons";
import { Led, btnSecondary, card, eyebrow, meta, selectPill } from "@/components/dash/ui";
import { DemoBadge, Empty, ErrorRetry, Loading } from "./States";
import Thumb from "./Thumb";

type Props = {
  city: string;
  cityName: string;
  query: UseQueryResult<Ticket[]>;
  filters: TicketFilters;
  onFilters: (f: TicketFilters) => void;
  selectedId: string | null;
  onSelect: (t: Ticket) => void;
  /** The summary card shows while nothing is selected; the detail card replaces it. */
  showSummary: boolean;
};

const FRESH_MS = 8000;

/** Ids that appeared since the previous poll, marked with a coral dot for a few seconds. */
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
    const timer = setTimeout(() => setFresh(new Set()), FRESH_MS);
    return () => clearTimeout(timer);
  }, [city, tickets]);

  return fresh;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Three dot-matrix counts for the list on screen. Derived from the tickets already fetched. */
function QueueSummary({ cityName, tickets, filtered }: { cityName: string; tickets: Ticket[]; filtered: boolean }) {
  const high = tickets.filter((t) => t.max_severity >= 3).length;
  const merged = tickets.reduce((sum, t) => sum + t.report_count, 0);
  const allDemo = tickets.length > 0 && tickets.every((t) => t.is_synthetic);
  const stats = [
    { n: tickets.length, label: filtered ? "Matching" : "In queue" },
    { n: high, label: "High severity" },
    { n: merged, label: "Reports merged" },
  ];
  return (
    <section aria-label="Queue summary" className={`${card} flex-none px-[18px] pb-3.5 pt-4`}>
      <div className="flex items-center justify-between gap-2">
        <span className={eyebrow}>
          Queue · {cityName}
          {filtered ? " · filtered" : ""}
        </span>
        {allDemo && <DemoBadge />}
      </div>
      <dl className="mt-3.5 grid grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} className={i === 0 ? "pr-3" : "border-l-2 border-dotted border-rim px-3 first:pl-0"}>
            <dd className="dot-num text-[46px]">{pad2(s.n)}</dd>
            <dt className="mt-2.5 text-[12.5px] font-semibold text-soft">{s.label}</dt>
          </div>
        ))}
      </dl>
      <p className={`${meta} mt-3.5 border-t-2 border-dotted border-rim pt-3`}>Updates every 5 s · highest severity first</p>
    </section>
  );
}

function StatusPill({ status }: { status: Status }) {
  const text = STATUS_TEXT[status] ?? status;
  if (status === "reviewed")
    return (
      <span className="inline-flex h-[30px] flex-none items-center gap-[7px] rounded-full bg-sun-wash pl-2.5 pr-3 text-[12.5px] font-semibold">
        <span className="size-2 rounded-full bg-[#d9a21a]" />
        {text}
      </span>
    );
  if (status === "resolved")
    return (
      <span className="inline-flex h-[30px] flex-none items-center gap-[7px] rounded-full bg-moss-wash pl-2.5 pr-3 text-[12.5px] font-semibold text-[#1f5e3e]">
        <span className="size-2 rounded-full bg-moss" />
        {text}
      </span>
    );
  return (
    <span className="inline-flex h-[30px] flex-none items-center gap-[7px] rounded-full border-[1.5px] border-rim pl-2.5 pr-3 text-[12.5px] font-semibold">
      <span className="size-2 rounded-full border-[1.5px] border-soft" />
      {text}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  all,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="relative inline-flex items-center">
      <select aria-label={label} className={selectPill} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <ChevronIcon size={14} className="pointer-events-none absolute right-3.5 text-soft" />
    </label>
  );
}

export default function QueueTab({ city, cityName, query, filters, onFilters, selectedId, onSelect, showSummary }: Props) {
  const fresh = useNewIds(city, query.data);
  const filtered = Boolean(filters.label || filters.status);
  const shortName = cityName.split(",")[0];

  return (
    <>
      {showSummary && query.data && <QueueSummary cityName={shortName} tickets={query.data} filtered={filtered} />}

      <section aria-label="Tickets" className={`${card} flex-none px-2.5 pb-2.5 pt-3.5`}>
        <div className="flex flex-wrap items-center gap-2 px-1.5 pb-3">
          <FilterSelect
            label="Filter by label"
            value={filters.label ?? ""}
            onChange={(v) => onFilters({ ...filters, label: (v || undefined) as Label | undefined })}
            all="All labels"
            options={LABEL_OPTIONS.map((l) => ({ id: l, name: labelText(l) }))}
          />
          <FilterSelect
            label="Filter by status"
            value={filters.status ?? ""}
            onChange={(v) => onFilters({ ...filters, status: (v || undefined) as Status | undefined })}
            all="All statuses"
            options={STATUS_OPTIONS.map((s) => ({ id: s, name: STATUS_TEXT[s] }))}
          />
          <span className={`${meta} ml-auto`}>{query.data ? `${query.data.length} tickets` : ""}</span>
        </div>

        {query.isPending ? (
          <Loading what="tickets" />
        ) : query.isError ? (
          <ErrorRetry error={query.error} onRetry={() => query.refetch()} />
        ) : query.data.length === 0 ? (
          <Empty
            action={
              filtered ? (
                <button onClick={() => onFilters({})} className={cn(btnSecondary, "h-9 text-[13px]")}>
                  Clear filters
                </button>
              ) : undefined
            }
          >
            {filtered ? "No tickets match these filters." : "No tickets yet."}
          </Empty>
        ) : (
          <ul className="flex flex-col gap-1">
            {query.data.map((t) => {
              const selected = t.id === selectedId;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onSelect(t)}
                    aria-pressed={selected}
                    className={`flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-row py-2.5 pl-2.5 pr-3 text-left transition-colors ${
                      selected
                        ? "bg-sun-wash shadow-[inset_0_0_0_1.5px_rgb(217_162_26/0.55)]"
                        : "hover:bg-white/75"
                    }`}
                  >
                    <Thumb src={t.photo_url} className="size-14 flex-none rounded-thumb">
                      {fresh.has(t.id) && (
                        <span
                          title="New since the last update"
                          className="absolute right-[5px] top-[5px] size-[11px] rounded-full bg-coral-pulse shadow-[0_0_0_2.5px_#fff]"
                        />
                      )}
                    </Thumb>
                    <span className="min-w-0 flex-1 basis-40">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold">{labelText(t.label)}</span>
                        {t.is_synthetic && <DemoBadge />}
                      </span>
                      <span className="mt-[5px] flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] font-medium text-soft">
                        <Led severity={t.max_severity} />
                        {severityText(t.max_severity)}
                        <span aria-hidden className="text-quiet/70">·</span>
                        <Tooltip content="Reports merged into this ticket: same place, within 50 m and seven days, with a similar photo.">
                          <span>
                            {t.report_count} {t.report_count === 1 ? "report" : "reports"}
                          </span>
                        </Tooltip>
                        <span aria-hidden className="text-quiet/70">·</span>
                        {timeAgo(t.last_seen)}
                      </span>
                    </span>
                    <span className="flex-none @max-[420px]:ml-[68px]">
                      <StatusPill status={t.status} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
