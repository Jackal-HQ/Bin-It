"use client";
// Aceternity UI — Card Hover Effect (https://ui.aceternity.com/components/card-hover-effect),
// adapted to the Raycast palette: a soft highlight slides behind the hovered card, and the
// cards themselves use the "keyboard key" inset-shadow treatment from .claude/DESIGN.md.
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

export type HoverItem = {
  n: string;
  title: string;
  description: string;
};

export function HoverEffect({ items, className }: { items: HoverItem[]; className?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-3", className)}>
      {items.map((item, idx) => (
        <div
          key={item.n}
          className="group relative block h-full w-full p-1"
          onMouseEnter={() => setHovered(idx)}
          onMouseLeave={() => setHovered(null)}
        >
          <AnimatePresence>
            {hovered === idx && (
              <motion.span
                className="absolute inset-0 block h-full w-full rounded-[16px] bg-white/[0.04]"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
              />
            )}
          </AnimatePresence>
          <div
            className="relative z-20 h-full rounded-[16px] bg-ink/60 p-6"
            style={{
              // the "key" shadow stack from DESIGN.md
              boxShadow:
                "rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset",
            }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-coral-pulse/10 font-mono text-xs text-coral-pulse">
              {item.n}
            </span>
            <p className="mt-3 text-[16px] font-medium text-white">{item.title}</p>
            <p className="mt-1.5 text-[14px] leading-6 text-ash">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function KeyCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-[16px] bg-ink/60 p-6", className)}
      style={{
        boxShadow:
          "rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset",
      }}
    >
      {children}
    </div>
  );
}
