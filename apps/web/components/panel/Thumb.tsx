"use client";

import { useState } from "react";
import { BinIcon } from "@/components/dash/icons";

/** Report photo from the public bucket; a sand halftone placeholder when missing or broken.
 *  `className` carries the size and radius, so one component serves the row thumb and the card photo. */
export default function Thumb({
  src,
  className,
  alt = "Report photo",
  emptyText,
  iconSize = 24,
  children,
}: {
  src?: string | null;
  className: string;
  alt?: string;
  /** Shown under the icon in large placeholders; thumbs leave it out. */
  emptyText?: string;
  iconSize?: number;
  /** Overlays (chips) positioned over the photo. */
  children?: React.ReactNode;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const missing = !src || broken === src;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {missing ? (
        <div
          title="No photo"
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[linear-gradient(150deg,#eadfc4,#cdbf9d)] text-strong/60 ${emptyText ? "pb-10" : ""}`}
        >
          <span aria-hidden className="photo-dots absolute inset-0" />
          <BinIcon size={iconSize} className="relative" />
          {emptyText && <span className="relative px-3 text-center text-xs font-medium">{emptyText}</span>}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- bucket host varies per deploy; no image optimizer needed
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setBroken(src)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {children}
    </div>
  );
}
