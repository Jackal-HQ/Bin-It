// Landing page. Style reference: .claude/DESIGN.md (Raycast): near-black canvas, one coral
// accent, Inter 400 headlines, neutral filled buttons, "keyboard key" cards.
import Link from "next/link";
import { Bento } from "@/components/landing/Bento";
import { HexGrid } from "@/components/landing/HexGrid";
import { ProductWindow } from "@/components/landing/ProductWindow";
import CountUp from "@/components/reactbits/CountUp";
import FadeContent from "@/components/reactbits/FadeContent";

const YEAR = new Date().getFullYear();

const STATS = [
  { value: 3, label: "cities, one config file each" },
  { value: 16744, label: "hexagons scored", separator: "," },
  { value: 50, label: "ranked bin sites per city" },
  { value: 5, label: "photo classes" },
];

const CITIES = [
  { name: "Orlando", tag: "Home city", seed: 2.2 },
  { name: "New York", tag: "Ported by config", seed: 5.4 },
  { name: "Chicago", tag: "Ported by config", seed: 8.1 },
];

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#cities", label: "Cities" },
];

const BUILT_ON = ["Neon Postgres", "Hugging Face", "Databricks", "OpenStreetMap", "Expo"];

const Eyebrow = ({ children }: { children: string }) => (
  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.073em] text-smoke">{children}</p>
);

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-void-black font-[family-name:var(--font-inter)] text-white antialiased">
      {/* Glass navigation bar: a compact floating pill */}
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

      {/* Hero: atmosphere from a blue wash and blurred coral bars; the product window sits in it */}
      <section className="relative isolate overflow-hidden px-6 pb-20 pt-36 sm:pt-44">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 22%, rgba(4,63,150,0.55), rgba(6,18,37,0.25) 55%, transparent 80%)",
          }}
        />
        <div
          aria-hidden
          className="absolute left-1/2 top-[18%] -z-10 h-[90px] w-[1100px] max-w-none -translate-x-1/2 -rotate-[24deg] rounded-full bg-coral-pulse/40 blur-[70px]"
        />
        <div
          aria-hidden
          className="absolute left-[60%] top-[34%] -z-10 h-[60px] w-[700px] max-w-none -translate-x-1/2 -rotate-[24deg] rounded-full bg-coral-pulse/25 blur-[60px]"
        />
        {/* faint dot grid, masked toward the center */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_60%_45%_at_50%_30%,black,transparent)]"
        />

        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span className="mb-6 rounded-[6px] bg-graphite px-2 py-1 font-mono text-[11px] uppercase tracking-[0.073em] text-ash">
            Trash Overflow Planner
          </span>
          <h1 className="max-w-[820px] text-balance text-[40px] font-normal leading-[1.1] tracking-[0.22px] sm:text-[56px] sm:leading-[1.17]">
            See where new trash bins would <span className="text-coral-pulse">help most</span>.
          </h1>
          <p className="mt-6 max-w-[480px] text-[16px] leading-[1.5] text-ash">
            Residents photo-report overflowing bins from their phones. Staff get a dashboard that
            corrects for reporting bias and ranks the best places to add bins, shown as estimates
            and never as measured outcomes.
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
          <p className="mt-6 font-mono text-[12px] text-smoke">
            Orlando, FL&nbsp;&nbsp;|&nbsp;&nbsp;ports to NYC &amp; Chicago by config
          </p>
        </div>

        <div id="product" className="relative mt-16 scroll-mt-24">
          <ProductWindow />
        </div>
      </section>

      {/* Built-on strip */}
      <section className="relative z-10 border-y border-rc-border/60 px-6 py-5">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-[12px] text-smoke">
          <span className="text-ash">Built on</span>
          {BUILT_ON.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 mx-auto w-full max-w-[1200px] scroll-mt-24 px-6 py-24">
        <FadeContent>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mb-10 max-w-2xl text-[32px] font-normal leading-[1.15]">
            From a photo on a phone to a bin on a map.
          </h2>
          <Bento />
        </FadeContent>
      </section>

      {/* Stats: divided columns, not boxes */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-24">
        <FadeContent>
          <div className="grid grid-cols-2 border-y border-rc-border lg:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`px-2 py-8 sm:px-6 ${i > 0 ? "lg:border-l lg:border-rc-border" : ""} ${
                  i % 2 === 1 ? "border-l border-rc-border lg:border-l" : ""
                }`}
              >
                <div className="text-[40px] font-medium leading-none text-white">
                  <CountUp to={s.value} separator={s.separator ?? ""} duration={1.6} />
                </div>
                <p className="mt-3 text-[14px] text-ash">{s.label}</p>
              </div>
            ))}
          </div>
        </FadeContent>
      </section>

      {/* Cities + caveat */}
      <section id="cities" className="relative z-10 mx-auto w-full max-w-[1200px] scroll-mt-24 px-6 pb-24">
        <FadeContent>
          <Eyebrow>Cities</Eyebrow>
          <h2 className="mb-8 max-w-2xl text-[32px] font-normal leading-[1.15]">
            A new city is a config file and a data load.
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {CITIES.map((c) => (
              <div
                key={c.name}
                className="overflow-hidden rounded-[16px] border border-rc-border bg-ink/60"
              >
                <div className="h-[110px] overflow-hidden bg-void-black">
                  <HexGrid cover cols={12} rows={5} seed={c.seed} />
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-[16px] font-medium">{c.name}</span>
                  <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 text-[12px] text-ash">
                    {c.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 font-mono text-[11px] text-smoke">
            Grids are illustrative, not real scores.
          </p>
          <div className="mt-6 rounded-[16px] bg-ember-hush/60 p-6">
            <p className="text-[16px] font-medium text-white">Estimates, not measurements</p>
            <p className="mt-2 max-w-3xl text-[14px] leading-[1.6] text-ash">
              Orlando has no confirmed 311 sanitation dataset, so the model is trained on New York
              and Chicago and applied to Orlando. That transfer is only lightly validated. Every
              projected change on the dashboard is an estimate.
            </p>
          </div>
        </FadeContent>
      </section>

      {/* Closing call to action */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-24">
        <div className="rounded-[20px] border border-rc-border bg-ink/60 px-6 py-14 text-center">
          <h2 className="mx-auto max-w-xl text-[32px] font-normal leading-[1.15]">
            See the queue, the gaps and the plan.
          </h2>
          <div className="mt-6 flex justify-center">
            <Link
              href="/dashboard"
              className="flex h-10 items-center justify-center rounded-[8px] bg-mist px-4 text-[14px] font-medium text-iron transition-opacity hover:opacity-90"
            >
              Open dashboard
            </Link>
          </div>
        </div>
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
