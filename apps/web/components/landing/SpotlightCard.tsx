"use client";

// Frosted card with a soft highlight that follows the cursor (Aceternity-style spotlight,
// kept neutral). Falls back to a plain card without a pointer.
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

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
      className={cn("group relative overflow-hidden rounded-card bg-glass p-6 shadow-card backdrop-blur-[24px] sm:p-7", className)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.7), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
