"use client";
// Aceternity UI: Tooltip Card (https://ui.aceternity.com/components/tooltip-card).
// Same behavior as the original: a card follows the pointer, opens with a spring height
// animation, flips at the viewport edges, and toggles on tap for touch devices.
// Adapted for this app:
//  - themed with the Daylight tokens in .claude/DESIGN.md (charcoal float, on-charcoal text);
//  - rendered in a portal with fixed positioning, so it is never clipped by the scrolling
//    side panel or table wrappers;
//  - also opens on keyboard focus of a child, and closes on Escape.
import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 240; // min-w-[15rem], as in the original
const OFFSET = 12;
const EDGE = 8;

export function Tooltip({
  content,
  children,
  containerClassName,
}: {
  content: string | React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
}) {
  const id = useId();
  const [isVisible, setIsVisible] = useState(false);
  // pointer position in viewport coordinates
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: MIN_WIDTH, h: 0 });
  const innerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // the portal target (document.body) exists only on the client
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Measure the content so the card can animate to its natural height and flip correctly.
  useLayoutEffect(() => {
    if (isVisible && innerRef.current) {
      setSize({
        w: Math.max(MIN_WIDTH, innerRef.current.scrollWidth),
        h: innerRef.current.scrollHeight,
      });
    }
  }, [isVisible, content]);

  const show = useCallback((x: number, y: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPointer({ x, y });
    setIsVisible(true);
  }, []);
  const hide = useCallback(() => setIsVisible(false), []);

  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsVisible(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isVisible]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  // Place to the lower right of the pointer; flip to the other side near a viewport edge.
  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;
  let left = pointer.x + OFFSET;
  if (left + size.w > vw - EDGE) left = pointer.x - size.w - OFFSET;
  left = Math.max(EDGE, left);
  let top = pointer.y + OFFSET;
  if (top + size.h > vh - EDGE) top = pointer.y - size.h - OFFSET;
  top = Math.max(EDGE, top);

  return (
    <div
      className={cn("relative inline-block", containerClassName)}
      aria-describedby={isVisible ? id : undefined}
      onMouseEnter={(e) => show(e.clientX, e.clientY)}
      onMouseMove={(e) => isVisible && setPointer({ x: e.clientX, y: e.clientY })}
      onMouseLeave={hide}
      onFocus={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        show(r.left + r.width / 2, r.bottom);
      }}
      onBlur={hide}
      onTouchStart={(e) => {
        const t = e.touches[0];
        show(t.clientX, t.clientY);
      }}
      onTouchEnd={() => {
        // keep it up briefly so a tap can be read
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(hide, 2000);
      }}
      onClick={(e) => {
        // on touch-only devices a tap toggles the card instead of activating the child
        if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
          e.preventDefault();
          if (isVisible) hide();
          else show(e.clientX, e.clientY);
        }
      }}
    >
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isVisible && (
              <motion.div
                id={id}
                role="tooltip"
                initial={{ height: 0, opacity: 1 }}
                animate={{ height: size.h, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="pointer-events-none fixed z-[100] overflow-hidden rounded-[18px] bg-charcoal shadow-[0_18px_32px_-14px_rgb(42_41_38/0.65)]"
                style={{ top, left, minWidth: MIN_WIDTH, maxWidth: 320 }}
              >
                <div ref={innerRef} className="px-3.5 py-3 text-[12.5px] leading-[1.5] text-on-charcoal">
                  {content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}

/** Original name used elsewhere in the dashboard. */
export const TooltipCard = Tooltip;
