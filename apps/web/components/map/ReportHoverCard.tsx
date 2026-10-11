"use client";

// Card shown while the pointer is over a report pin on the map: photo, label, severity,
// status, report count and when it was last seen. A Daylight float (glass card, rounded photo,
// LED severity); positioned from deck.gl's pick coordinates and kept inside the map box.
import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { STATUS_TEXT, labelText, severityText, timeAgo } from "@/lib/labels";
import type { Ticket } from "@/lib/types";
import { Led } from "@/components/dash/ui";
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
      className="pointer-events-none absolute z-20 overflow-hidden rounded-float bg-glass-strong p-2 shadow-pop backdrop-blur-[22px]"
      style={{ left, top, width: WIDTH }}
    >
      <Thumb
        src={ticket.photo_url}
        alt={`Photo: ${labelText(ticket.label)}`}
        className="h-28 w-full rounded-[20px]"
        emptyText="No photo stored"
      />
      <div className="px-1.5 pb-1.5 pt-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-bold text-strong">{labelText(ticket.label)}</span>
          {ticket.is_synthetic && (
            <span className="inline-flex h-5 items-center rounded-full border-[1.5px] border-dotted border-quiet/45 px-2 font-mono text-[10px] uppercase tracking-[0.07em] text-quiet">
              Demo data
            </span>
          )}
        </div>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs leading-[1.5]">
          <dt className="text-quiet">Severity</dt>
          <dd className="flex items-center gap-2 font-semibold text-strong">
            <Led severity={sev} />
            {severityText(sev)} ({sev} of 3)
          </dd>
          <dt className="text-quiet">Status</dt>
          <dd className="font-semibold text-strong">{STATUS_TEXT[ticket.status] ?? ticket.status}</dd>
          <dt className="text-quiet">Reports</dt>
          <dd className="font-semibold text-strong">{ticket.report_count}</dd>
          {ticket.last_seen && (
            <>
              <dt className="text-quiet">Last seen</dt>
              <dd className="font-semibold text-strong">{timeAgo(ticket.last_seen)}</dd>
            </>
          )}
        </dl>
        <p className="mt-2 text-[11px] text-quiet">Click the pin for details.</p>
      </div>
    </motion.div>
  );
}
