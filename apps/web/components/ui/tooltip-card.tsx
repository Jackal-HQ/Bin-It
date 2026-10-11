"use client";
// Aceternity UI — Tooltip Card (https://ui.aceternity.com/components/tooltip-card).
// A floating card that appears above the trigger on hover and drifts with the pointer.
// Props mirror the documented API: content, children, containerClassName.
import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

export function TooltipCard({
  content,
  children,
  containerClassName,
}: {
  content: string | React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  // Spring-eased pointer X drives a small rotate + translate on the card.
  const x = useMotionValue(0);
  const springX: MotionValue<number> = useSpring(x, { stiffness: 100, damping: 15 });
  const rotate = useTransform(springX, [-100, 100], [-10, 10]);
  const translateX = useTransform(springX, [-100, 100], [-24, 24]);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    // offset from the center of the trigger
    x.set(e.clientX - (rect.left + rect.width / 2));
  }

  return (
    <div
      className={cn("relative inline-flex", containerClassName)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onMouseMove={onMouseMove}
    >
      <AnimatePresence mode="popLayout">
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ rotate, translateX, x: "-50%" }}
            className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-xs rounded-[12px] border border-rc-border bg-ink px-3 py-2 text-xs leading-5 text-ash shadow-xl"
          >
            {/* coral top accent, matching the design system */}
            <span className="absolute inset-x-3 -top-px h-px bg-gradient-to-r from-transparent via-coral-pulse to-transparent" />
            {content}
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}
