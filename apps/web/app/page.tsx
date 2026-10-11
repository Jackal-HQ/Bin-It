// Landing page. Style reference: .claude/DESIGN.md (Daylight): a warm paper ground, frosted
// rounded cards, pill controls, charcoal for the one action, dot-matrix numerals.
import Link from "next/link";
import { Bento } from "@/components/landing/Bento";
import BinBackdrop from "@/components/landing/BinBackdrop";
import { HexGrid } from "@/components/landing/HexGrid";
import { ProductWindow } from "@/components/landing/ProductWindow";
import { btnPrimary, btnSecondary } from "@/components/dash/ui";
import CountUp from "@/components/reactbits/CountUp";
import FadeContent from "@/components/reactbits/FadeContent";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteNav, type NavLink } from "@/components/site/SiteNav";
import { cn } from "@/lib/utils";

const STATS = [
  { value: 3, label: "cities, one config file each" },
  { value: 16744, label: "hexagons scored", separator: "," },
  { value: 50, label: "ranked bin sites per city" },
  { value: 5, label: "photo classes" },
];

// Dotted rules between the stat cells: two columns on a phone, four from lg.
const STAT_EDGES = [
  "",
  "border-l-2 border-dotted border-rim",
  "border-t-2 border-dotted border-rim lg:border-l-2 lg:border-t-0",
  "border-l-2 border-t-2 border-dotted border-rim lg:border-t-0",
];

const CITIES = [
  { name: "Orlando", tag: "Home city", seed: 2.2, home: true },
  { name: "New York", tag: "Ported by config", seed: 5.4, home: false },
  { name: "Chicago", tag: "Ported by config", seed: 8.1, home: false },
];

const NAV_LINKS: NavLink[] = [
  { href: "#product", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#cities", label: "Cities" },
];

const BUILT_ON = ["Neon Postgres", "Hugging Face", "Databricks", "OpenStreetMap", "Expo"];

const Eyebrow = ({ children }: { children: string }) => (
  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-quiet">{children}</p>
);

const H2 = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn("max-w-2xl text-[32px] font-extrabold leading-[1.12] tracking-[-0.02em]", className)}>{children}</h2>
);

export default function Home() {
  return (
    <div className="daylight relative flex min-h-dvh flex-col overflow-x-clip font-ui antialiased">
      <BinBackdrop />
      <SiteNav links={NAV_LINKS} />

      {/* Hero: the paper ground, one sun behind the headline, and the product window below it */}
      <section className="relative isolate overflow-hidden px-6 pb-20 pt-36 sm:pt-44">
        <div
          aria-hidden
          className="absolute left-1/2 top-[6%] -z-10 h-[420px] w-[860px] max-w-none -translate-x-1/2 rounded-full bg-sun/45 blur-[110px]"
        />
        {/* faint dot grid, masked toward the center */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(rgb(60_52_28/0.22)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_60%_45%_at_50%_30%,black,transparent)]"
        />

        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="mb-6 inline-flex h-[30px] items-center gap-2 rounded-full border-[1.5px] border-dashed border-quiet/45 bg-white/50 px-3.5 font-mono text-[11px] uppercase tracking-[0.07em] text-soft">
            <span className="size-[7px] rounded-full bg-sun ring-1 ring-sun-deep" />
            Trash Overflow Planner
          </span>
          <h1 className="max-w-[820px] text-balance text-[40px] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-[60px]">
            See where new trash bins would{" "}
            <span className="box-decoration-clone rounded-[16px] bg-sun px-2.5">help most</span>.
          </h1>
          <p className="mt-6 max-w-[520px] text-[17px] leading-[1.55] text-soft">
            Residents photo-report overflowing bins from their phones. Staff get a dashboard that
            corrects for reporting bias and ranks the best places to add bins, shown as estimates
            and never as measured outcomes.
          </p>
          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
            <Link href="/dashboard" className={btnPrimary}>
              Open dashboard
            </Link>
            <a href="#how" className={cn(btnSecondary, "h-12 px-6 text-[14px]")}>
              How it works
            </a>
          </div>
          <p className="mt-6 font-mono text-[12px] text-quiet">
            Orlando, FL&nbsp;&nbsp;·&nbsp;&nbsp;ports to NYC &amp; Chicago by config
          </p>
        </div>

        <div id="product" className="relative mt-16 scroll-mt-24">
          <ProductWindow />
        </div>
      </section>

      {/* Built-on strip */}
      <section className="relative z-10 border-y-2 border-dotted border-rim px-6 py-5">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-[12px] text-quiet">
          <span className="font-medium text-soft">Built on</span>
          {BUILT_ON.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto w-full max-w-[1200px] scroll-mt-24 px-6 py-24">
        <FadeContent>
          <Eyebrow>How it works</Eyebrow>
          <H2 className="mb-10">From a photo on a phone to a bin on a map.</H2>
          <Bento />
        </FadeContent>
      </section>

      {/* Stats: dot numerals in one card, divided by dotted rules */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-24">
        <FadeContent>
          <div className="grid grid-cols-2 overflow-hidden rounded-card bg-glass shadow-card backdrop-blur-[24px] lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={s.label} className={cn("px-4 py-7 sm:px-8 sm:py-8", STAT_EDGES[i])}>
                <div className="dot-num text-[30px] sm:text-[46px]">
                  <CountUp to={s.value} separator={s.separator ?? ""} duration={1.6} />
                </div>
                <p className="mt-3 text-[14px] font-medium text-soft">{s.label}</p>
              </div>
            ))}
          </div>
        </FadeContent>
      </section>

      {/* Cities + caveat */}
      <section id="cities" className="relative z-10 mx-auto w-full max-w-[1200px] scroll-mt-24 px-6 pb-24">
        <FadeContent>
          <Eyebrow>Cities</Eyebrow>
          <H2 className="mb-8">A new city is a config file and a data load.</H2>
          <div className="grid gap-4 sm:grid-cols-3">
            {CITIES.map((c) => (
              <div key={c.name} className="overflow-hidden rounded-card bg-glass shadow-card backdrop-blur-[24px]">
                <div className="m-2 h-[110px] overflow-hidden rounded-[22px] bg-[#f4f0e8]">
                  <HexGrid cover cols={12} rows={5} seed={c.seed} />
                </div>
                <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-2">
                  <span className="text-[17px] font-extrabold tracking-[-0.01em]">{c.name}</span>
                  <span
                    className={cn(
                      "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-mono text-[10px] uppercase tracking-[0.07em]",
                      c.home ? "bg-sun-wash text-sun-ink" : "bg-well text-soft",
                    )}
                  >
                    {c.home && <span className="size-[7px] rounded-full bg-sun ring-1 ring-sun-deep" />}
                    {c.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[11px] text-quiet">Grids are illustrative, not real scores.</p>
          <div className="mt-6 rounded-card border-[1.5px] border-dotted border-sun-deep/50 bg-sun/20 px-6 py-6">
            <p className="text-[16px] font-extrabold">Estimates, not measurements</p>
            <p className="mt-2 max-w-3xl text-[14px] leading-[1.65] text-[#3e3b33]">
              Orlando has no confirmed 311 sanitation dataset, so the model is trained on New York
              and Chicago and applied to Orlando. That transfer is only lightly validated. Every
              projected change on the dashboard is an estimate.
            </p>
          </div>
        </FadeContent>
      </section>

      {/* Closing call to action: the charcoal result card, with a sun button */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-24">
        <div className="relative overflow-hidden rounded-card bg-charcoal px-6 py-14 text-center shadow-charcoal">
          <div aria-hidden className="dot-grid absolute inset-0" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl text-[32px] font-extrabold leading-[1.12] tracking-[-0.02em] text-white">
              See the queue, the gaps and the plan.
            </h2>
            <div className="mt-7 flex justify-center">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-full bg-sun px-7 text-[14px] font-bold text-strong transition-colors hover:bg-[#fad766]"
              >
                Open dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
