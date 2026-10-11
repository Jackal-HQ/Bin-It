"use client";

import { useState } from "react";

/** Report photo from the public bucket; a dark placeholder when missing or broken. */
export default function Thumb({
  src,
  className,
  alt = "Report photo",
  emptyText = "–",
}: {
  src?: string | null;
  className: string;
  alt?: string;
  emptyText?: string;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  if (!src || broken === src) {
    return (
      <div
        title="No photo"
        className={`${className} flex items-center justify-center rounded-[8px] bg-obsidian text-xs text-smoke`}
      >
        {emptyText}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- bucket host varies per deploy; no image optimizer needed
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(src)}
      className={`${className} rounded-[8px] object-cover`}
    />
  );
}
