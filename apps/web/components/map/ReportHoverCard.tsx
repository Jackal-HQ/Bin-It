"use client";

// Card shown while the pointer is over a report pin on the map: photo, label, severity,
// status, report count and when it was last seen. Same look as the Tooltip Card
// (components/ui/tooltip-card.tsx); positioned from deck.gl's pick coordinates and kept
// inside the map box.
import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { STATUS_TEXT, labelText, rgb, severityColor, severityText, timeAgo } from "@/lib/labels";
import type { Ticket } from "@/lib/types";
import Thumb from "@/components/panel/Thumb";

const WIDTH = 248;
const OFFSET = 14;
const EDGE = 8;

type Props = {
  ticket: Ticket;
  /** pointer position inside the map container, in px */
  x: number;
  y: number;
  /** map container size, to flip the card away from the edges */
  bounds: { width: number; height: number };
};

export default function ReportHoverCard({ ticket, x, y, bounds }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(220);

  useLayoutEffect(() => {
    if (ref.current) setHeight(ref.current.offsetHeight);
  }, [ticket.id, ticket.photo_url]);

  let left = x + OFFSET;
  if (left + WIDTH > bounds.width - EDGE) left = x - WIDTH - OFFSET;
  left = Math.max(EDGE, left);
  let top = y + OFFSET;
  if (top + height > bounds.height - EDGE) top = y - height - OFFSET;
  top = Math.max(EDGE, top);

  const sev = ticket.max_severity;
  return (
    <motion.div
      ref={ref}
      role="tooltip"
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="pointer-events-none absolute z-20 overflow-hidden rounded-[12px] border border-rc-border bg-ink p-2 shadow-[rgba(255,255,255,0.05)_0px_1px_0px_0px_inset]"
      style={{ left, top, width: WIDTH }}
    >
      <Thumb
        src={ticket.photo_url}
        alt={`Photo: ${labelText(ticket.label)}`}
        className="h-28 w-full"
        emptyText="No photo stored"
      />
      <div className="px-1 pb-1 pt-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-white">{labelText(ticket.label)}</span>
          {ticket.is_synthetic && (
            <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.073em] text-ash">
              Demo data
            </span>
          )}
        </div>
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs leading-[1.5]">
          <dt className="text-smoke">Severity</dt>
          <dd className="flex items-center gap-1.5 text-white">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: rgb(severityColor(sev)) }} />
            {severityText(sev)} ({sev} of 3)
          </dd>
          <dt className="text-smoke">Status</dt>
          <dd className="text-white">{STATUS_TEXT[ticket.status] ?? ticket.status}</dd>
          <dt className="text-smoke">Reports</dt>
          <dd className="text-white">{ticket.report_count}</dd>
          {ticket.last_seen && (
            <>
              <dt className="text-smoke">Last seen</dt>
              <dd className="text-white">{timeAgo(ticket.last_seen)}</dd>
            </>
          )}
        </dl>
        <p className="mt-1.5 text-[11px] text-smoke">Click the pin for details.</p>
      </div>
    </motion.div>
  );
}
