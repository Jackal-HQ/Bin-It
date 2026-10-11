"use client";

// Key-shadow card with a soft highlight that follows the cursor (Aceternity-style spotlight,
// kept neutral per .claude/DESIGN.md). Falls back to a plain card without a pointer.
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const KEY_SHADOW =
  "rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset";

export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn("group relative overflow-hidden rounded-[16px] bg-ink/70 p-6", className)}
      style={{ boxShadow: KEY_SHADOW }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.07), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
