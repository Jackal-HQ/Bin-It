"use client";

// Fixed full-viewport canvas behind the landing page: a 3D bin that turns as the page scrolls.
// three.js and the scene load after first paint, so they never block the page. The page works
// without it (no WebGL, or reduced motion shows one still frame), and it never takes pointer
// events.
import { useEffect, useRef } from "react";

/** Radians of turn per pixel scrolled (about one full turn every 1500 px). */
const TURN_PER_PX = 0.0042;
/** Resting angle: the bin's decal faces the camera a little to the left. */
const REST_ANGLE = 0.5;

export default function BinBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      let scene;
      try {
        const { createBinScene } = await import("./bin3d");
        if (cancelled) return;
        scene = createBinScene(canvas);
      } catch {
        return; // no WebGL: the page simply has no bin
      }
      if (cancelled) {
        scene.dispose();
        return;
      }

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const angleFor = () => (reduced ? REST_ANGLE : REST_ANGLE + window.scrollY * TURN_PER_PX);

      let target = angleFor();
      let current = target;
      let raf = 0;
      let last = 0;

      // Ease toward the scroll position so a flick keeps turning for a moment.
      const frame = (now: number) => {
        raf = 0;
        const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
        last = now;
        current += (target - current) * (1 - Math.exp(-dt * 9));
        if (Math.abs(target - current) < 0.0005) current = target;
        scene.render(current);
        if (current !== target) raf = requestAnimationFrame(frame);
      };
      const kick = () => {
        target = angleFor();
        if (!raf) {
          last = performance.now();
          raf = requestAnimationFrame(frame);
        }
      };

      scene.render(current);
      canvas.dataset.ready = "true";

      const onResize = () => scene.render(current);
      window.addEventListener("resize", onResize);
      if (!reduced) window.addEventListener("scroll", kick, { passive: true });

      cleanup = () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", kick);
        if (raf) cancelAnimationFrame(raf);
        scene.dispose();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      // Fades in once drawn; on a phone the bin is a quieter watermark so copy crossing it stays legible.
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-0 transition-opacity duration-700 data-[ready=true]:opacity-100 max-md:data-[ready=true]:opacity-50"
    />
  );
}
