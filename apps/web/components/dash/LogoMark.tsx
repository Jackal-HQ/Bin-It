"use client";

// The Bin-It mark, tappable. It sits inside the home link, so a single tap still goes home (after
// a short beat, with the dots turning a sixth of a turn). Tapping again and again keeps the
// visitor here and spins the six outer dots round the coral one; each extra tap adds more spin.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HexMark } from "@/components/dash/icons";

/** Taps closer together than this count as one run. */
const RUN_MS = 650;
/** How long a lone tap waits for a second one before the link is followed. */
const NAV_DELAY_MS = 380;

export function LogoMark({ size = 32 }: { size?: number }) {
  const router = useRouter();
  const center = useRef<SVGCircleElement>(null);
  const run = useRef({ count: 0, last: 0 });
  const navTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [spin, setSpin] = useState({ deg: 0, ms: 0 });

  useEffect(() => () => clearTimeout(navTimer.current), []);

  const onClick = (e: React.MouseEvent) => {
    // Leave keyboard activation, modified clicks and reduced motion to the plain link.
    if (
      e.detail === 0 ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    e.preventDefault();

    const now = performance.now();
    const r = run.current;
    r.count = now - r.last < RUN_MS ? r.count + 1 : 1;
    r.last = now;
    clearTimeout(navTimer.current);

    center.current?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
      { duration: 360, easing: "ease-out" },
    );

    if (r.count === 1) {
      setSpin((s) => ({ deg: s.deg + 60, ms: 360 }));
      navTimer.current = setTimeout(() => {
        if (window.location.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" });
        else router.push("/");
      }, NAV_DELAY_MS);
    } else {
      // from the fourth tap on, two turns instead of one
      const turns = r.count >= 4 ? 2 : 1;
      setSpin((s) => ({ deg: s.deg + 360 * turns, ms: 900 + 250 * turns }));
    }
  };

  return (
    <span onClick={onClick} className="inline-flex cursor-pointer select-none" style={{ touchAction: "manipulation" }}>
      <HexMark
        size={size}
        centerRef={center}
        ringStyle={{
          transformBox: "fill-box",
          transformOrigin: "center",
          transform: `rotate(${spin.deg}deg)`,
          transition: `transform ${spin.ms}ms cubic-bezier(0.16, 0.84, 0.24, 1)`,
        }}
      />
    </span>
  );
}
