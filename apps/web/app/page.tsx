import { Spotlight } from "@/components/ui/spotlight";
import { HoverEffect } from "@/components/ui/card-hover-effect";

const YEAR = new Date().getFullYear();

const STEPS = [
  { n: "1", title: "Report", description: "A resident snaps an overflowing bin; it's classified and deduped." },
  { n: "2", title: "Rank", description: "Expected overflow is compared to reports to flag under-reported areas." },
  { n: "3", title: "Place", description: "Greedy coverage picks the best new bin sites and runs what-if scenarios." },
];

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-void-black antialiased">
      {/* floating glass nav (DESIGN.md: Glass Navigation Bar) */}
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav className="flex w-full max-w-[1200px] items-center justify-between rounded-[8px] border border-rc-border bg-white/[0.02] px-4 py-2 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-3 rotate-45 rounded-[2px] bg-coral-pulse" />
            <span className="text-[13px] font-medium text-white">Bin-It</span>
          </div>
          <a
            href="/dashboard"
            className="rounded-[8px] bg-mist px-3 py-1.5 text-[13px] font-medium text-iron transition-opacity hover:opacity-90"
          >
            Open dashboard
          </a>
        </nav>
      </header>

      {/* hero (DESIGN.md: Spotlight atmosphere + 56px/400 headline, neutral CTAs) */}
      <section className="relative flex min-h-dvh w-full flex-col items-center justify-center px-6">
        <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#ff6363" />
        {/* subtle grid wash */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,161,255,0.08),transparent_60%)]" />

        <div className="relative z-10 flex max-w-2xl flex-col items-center text-center">
          <span className="mb-6 rounded-[6px] bg-graphite px-2 py-1 font-mono text-[11px] uppercase tracking-[0.073em] text-ash">
            Trash Overflow Planner
          </span>
          <h1 className="text-[40px] font-normal leading-[1.1] tracking-[0.22px] text-white sm:text-[56px] sm:leading-[1.17]">
            See where new trash bins
            <br />
            would <span className="text-coral-pulse">help most</span>.
          </h1>
          <p className="mt-6 max-w-md text-[16px] leading-[1.5] text-ash">
            Residents photo-report overflowing bins from their phones. Staff get a dashboard
            that corrects for reporting bias and ranks the best places to add bins — shown as
            estimates, never measured outcomes.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/dashboard"
              className="flex h-11 items-center justify-center rounded-[8px] bg-mist px-5 text-[14px] font-medium text-iron transition-opacity hover:opacity-90"
            >
              Open dashboard
            </a>
            <a
              href="/privacy"
              className="flex h-11 items-center justify-center rounded-[8px] border border-rc-border px-5 text-[14px] font-medium text-ash transition-colors hover:text-white"
            >
              Privacy &amp; terms
            </a>
          </div>

          <p className="mt-10 font-mono text-[12px] tracking-[0.017em] text-smoke">
            Orlando, FL&nbsp;&nbsp;|&nbsp;&nbsp;ports to NYC &amp; Chicago by config&nbsp;&nbsp;|&nbsp;&nbsp;Neon · Hugging Face · Databricks
          </p>
        </div>
      </section>

      {/* how it works (DESIGN.md: feature cards with key shadow) */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-32">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[0.073em] text-smoke">
          How it works
        </p>
        <HoverEffect items={STEPS} />
      </section>

      {/* footer meta strip */}
      <footer className="relative z-10 border-t border-rc-border/60 px-6 py-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[12px] text-smoke">
          <span>© {YEAR} Bin-It</span>
          <span aria-hidden>|</span>
          <a href="/privacy" className="hover:text-white">Privacy</a>
          <span aria-hidden>|</span>
          <a href="/terms" className="hover:text-white">Terms</a>
          <span aria-hidden>|</span>
          <a href="/dashboard" className="hover:text-white">Dashboard</a>
        </div>
      </footer>
    </div>
  );
}
