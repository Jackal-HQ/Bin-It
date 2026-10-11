// Landing page. Style reference: .claude/DESIGN.md (Raycast): near-black canvas, one coral
// accent, Inter 400 headlines, neutral filled buttons, "keyboard key" cards.
import Link from "next/link";
import type { ReactNode } from "react";
import { HoverEffect, KeyCard } from "@/components/ui/card-hover-effect";
import CountUp from "@/components/reactbits/CountUp";
import FadeContent from "@/components/reactbits/FadeContent";

const YEAR = new Date().getFullYear();

const KEY_SHADOW =
  "rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset";

const icon = (children: ReactNode) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    {children}
  </svg>
);

const STEPS = [
  {
    n: "1",
    title: "Report",
    description:
      "A resident photographs an overflowing bin. It is classified, scored for severity, and merged with nearby duplicates.",
    icon: icon(
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>,
    ),
  },
  {
    n: "2",
    title: "Rank",
    description:
      "Expected overflow is compared with how often people report, which flags the places nobody is calling in.",
    icon: icon(<path d="M5 20V10M12 20V4M19 20v-7" />),
  },
  {
    n: "3",
    title: "Place",
    description:
      "Staff get ranked bin sites with a plain reason for each, and a what-if that shows the estimated change.",
    icon: icon(
      <>
        <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>,
    ),
  },
];

const STATS = [
  { value: 3, label: "cities, one config file each" },
  { value: 16744, label: "hexagons scored", separator: "," },
  { value: 50, label: "ranked bin sites per city" },
  { value: 5, label: "photo classes" },
];

const CITIES = [
  { name: "Orlando", tag: "Home city" },
  { name: "New York", tag: "Ported by config" },
  { name: "Chicago", tag: "Ported by config" },
];

const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#product", label: "Product" },
  { href: "#cities", label: "Cities" },
];

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-void-black text-white antialiased">
      {/* Glass navigation bar: a compact floating pill, not a full-width header */}
      <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <nav className="flex w-full max-w-[720px] items-center justify-between gap-4 rounded-full border border-rc-border bg-void-black/60 py-2 pl-5 pr-2 backdrop-blur-[48px]">
          <Link href="/" className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-3 rotate-45 rounded-[2px] bg-coral-pulse" />
            <span className="text-[13px] font-medium text-white">Bin-It</span>
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[13px] font-medium text-ash transition-colors hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </div>
          <Link
            href="/dashboard"
            className="rounded-full bg-mist px-3 py-1.5 text-[13px] font-medium text-iron transition-opacity hover:opacity-90"
          >
            Open dashboard
          </Link>
        </nav>
      </header>

      {/* Hero: atmosphere comes from blurred coral bars and a blue wash, not shadows */}
      <section className="relative isolate flex h-dvh max-h-[900px] min-h-[640px] w-full flex-col items-center justify-center overflow-hidden px-6">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 55% at 50% 30%, rgba(4,63,150,0.55), rgba(6,18,37,0.25) 55%, transparent 80%)",
          }}
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-[34%] -z-10 h-[90px] w-[1100px] max-w-none -translate-x-1/2 -rotate-[24deg] rounded-full bg-coral-pulse/45 blur-[60px]"
        />
        <div
          aria-hidden
          className="absolute left-[58%] top-[52%] -z-10 h-[60px] w-[700px] max-w-none -translate-x-1/2 -rotate-[24deg] rounded-full bg-coral-pulse/30 blur-[50px]"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-void-black to-transparent"
        />

        <div className="flex max-w-2xl flex-col items-center text-center">
          <span className="mb-6 rounded-[6px] bg-graphite px-2 py-1 font-mono text-[11px] uppercase tracking-[0.073em] text-ash">
            Trash Overflow Planner
          </span>
          <h1 className="text-[40px] font-normal leading-[1.1] tracking-[0.22px] sm:text-[56px] sm:leading-[1.17]">
            See where new trash bins
            <br />
            would <span className="text-coral-pulse">help most</span>.
          </h1>
          <p className="mt-6 max-w-[480px] text-[16px] leading-[1.5] text-ash">
            Residents photo-report overflowing bins from their phones. Staff get a dashboard
            that corrects for reporting bias and ranks the best places to add bins, shown as
            estimates and never as measured outcomes.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/dashboard"
              className="flex h-10 items-center justify-center rounded-[8px] bg-mist px-4 text-[14px] font-medium text-iron transition-opacity hover:opacity-90"
              style={{ boxShadow: "rgba(0,0,0,0.03) 0px 7px 3px 0px, rgba(0,0,0,0.25) 0px 4px 4px 0px" }}
            >
              Open dashboard
            </Link>
            <a
              href="#how"
              className="flex h-10 items-center justify-center rounded-[8px] border border-rc-border px-4 text-[14px] font-medium text-ash transition-colors hover:text-white"
            >
              How it works
            </a>
          </div>
          <p className="mt-8 font-mono text-[12px] text-smoke">
            Orlando, FL&nbsp;&nbsp;|&nbsp;&nbsp;ports to NYC &amp; Chicago by config&nbsp;&nbsp;|&nbsp;&nbsp;Neon · Hugging Face · Databricks
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto w-full max-w-[1200px] scroll-mt-24 px-6 py-24">
        <FadeContent>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.073em] text-smoke">
            How it works
          </p>
          <h2 className="mb-10 max-w-2xl text-[32px] font-normal leading-[1.15]">
            From a photo on a phone to a bin on a map.
          </h2>
          <HoverEffect items={STEPS} className="-mx-1" />
        </FadeContent>
      </section>

      {/* Product window mockup */}
      <section id="product" className="relative z-10 mx-auto w-full max-w-[1200px] scroll-mt-24 px-6 pb-24">
        <FadeContent>
          <div
            className="mx-auto max-w-[760px] rounded-[12px] bg-ink p-3"
            style={{ boxShadow: KEY_SHADOW }}
          >
            <div className="rounded-[16px] bg-obsidian px-4 py-3 text-[16px] text-ash">
              Add top 20 recommended bins
              <span className="ml-2 text-smoke">· Orlando</span>
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {[
                { t: "Recommended site 1", d: "6,095 m to the nearest bin", active: true },
                { t: "Recommended site 2", d: "434 m to the nearest bin", active: false },
                { t: "What-if: top 20 bins", d: "6% to 31% of demand within 150 m (estimate)", active: false },
              ].map((row) => (
                <li
                  key={row.t}
                  className={`flex items-center justify-between gap-4 rounded-[8px] px-3 py-2.5 text-[14px] ${
                    row.active ? "bg-coral-pulse/15 text-white" : "text-ash"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full ${row.active ? "bg-coral-pulse" : "bg-smoke"}`}
                    />
                    {row.t}
                  </span>
                  <span className="text-right text-smoke">{row.d}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mx-auto mt-4 max-w-[760px] text-center font-mono text-[12px] text-smoke">
            Illustration of the dashboard layout. Figures come from our current Orlando model run
            and are estimates.
          </p>
        </FadeContent>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-24">
        <FadeContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STATS.map((s) => (
              <KeyCard key={s.label}>
                <div className="text-[32px] font-medium leading-none text-white">
                  <CountUp to={s.value} separator={s.separator ?? ""} duration={1.6} />
                </div>
                <p className="mt-3 text-[14px] text-ash">{s.label}</p>
              </KeyCard>
            ))}
          </div>
        </FadeContent>
      </section>

      {/* Cities + caveat */}
      <section id="cities" className="relative z-10 mx-auto w-full max-w-[1200px] scroll-mt-24 px-6 pb-24">
        <FadeContent>
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.073em] text-smoke">
            Cities
          </p>
          <h2 className="mb-8 max-w-2xl text-[32px] font-normal leading-[1.15]">
            A new city is a config file and a data load.
          </h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {CITIES.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-[8px] border border-rc-border p-4"
              >
                <span className="text-[16px] font-medium">{c.name}</span>
                <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 text-[12px] text-ash">
                  {c.tag}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-[16px] bg-ember-hush/60 p-6">
            <p className="text-[16px] font-medium text-white">Estimates, not measurements</p>
            <p className="mt-2 max-w-3xl text-[14px] leading-[1.6] text-ash">
              Orlando has no confirmed 311 sanitation dataset, so the model is trained on New
              York and Chicago and applied to Orlando. That transfer is only lightly validated.
              Every projected change on the dashboard is an estimate.
            </p>
          </div>
        </FadeContent>
      </section>

      {/* Footer meta strip */}
      <footer className="relative z-10 mt-auto border-t border-rc-border/60 px-6 py-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[12px] text-smoke">
          <span>© {YEAR} Bin-It</span>
          <span aria-hidden>|</span>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <span aria-hidden>|</span>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          <span aria-hidden>|</span>
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}
