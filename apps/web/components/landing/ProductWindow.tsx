// A recreated dashboard window for the hero. The layout mirrors the real Daylight dashboard
// (city group, Queue / Bins / Scenario tabs, map card, ranked sites, what-if card); the hex map
// is illustrative and the two distances come from our current Orlando model run.
import { HexGrid } from "@/components/landing/HexGrid";

const ROWS = [
  { t: "Site 1", d: "6,095 m to nearest bin", active: true },
  { t: "Site 2", d: "434 m to nearest bin", active: false },
  { t: "Site 3", d: "ranked by demand served", active: false },
  { t: "Site 4", d: "ranked by demand served", active: false },
];

const TABS = ["Queue", "Bins", "Scenario"];

export function ProductWindow() {
  return (
    <div className="mx-auto w-full max-w-[1040px] rounded-map bg-glass p-3 shadow-float backdrop-blur-[24px]">
      <div className="flex items-center justify-between gap-3 px-1 pb-3 pt-1">
        <div className="flex items-center gap-2 rounded-full bg-glass-strong p-1 shadow-bar">
          <span className="rounded-full bg-charcoal px-4 py-1.5 text-[13px] font-bold text-white">Orlando</span>
          <span className="hidden px-3 text-[13px] font-semibold text-soft sm:inline">New York</span>
          <span className="hidden px-3 text-[13px] font-semibold text-soft sm:inline">Chicago</span>
        </div>
        <div className="hidden items-center gap-1 rounded-full bg-glass-strong p-1 shadow-bar sm:flex">
          {TABS.map((t) => (
            <span
              key={t}
              className={`rounded-full px-4 py-1.5 text-[13px] ${
                t === "Bins" ? "bg-charcoal font-bold text-white" : "font-semibold text-soft"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr]">
        <div className="relative overflow-hidden rounded-card bg-[#f4f0e8] p-3 pb-12">
          <HexGrid
            cols={15}
            rows={9}
            seed={2.2}
            pins={[
              [10, 2],
              [4, 5],
              [12, 6],
              [6, 1],
            ]}
            flags={[
              [9, 3],
              [3, 6],
              [11, 5],
            ]}
          />
          <p className="absolute bottom-3 left-3 right-3 rounded-full bg-white/80 px-3.5 py-1.5 font-mono text-[10px] leading-[1.5] text-soft backdrop-blur-[10px]">
            Illustrative: blue = expected overflow, pink dashed = under-reported
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1 rounded-card bg-glass-strong p-2 shadow-card">
            {ROWS.map((r, i) => (
              <li
                key={r.t}
                className={`flex items-center justify-between gap-3 rounded-row px-3 py-2.5 text-[13px] ${
                  r.active ? "bg-sun-wash shadow-[inset_0_0_0_1.5px_rgb(217_162_26/0.55)]" : ""
                }`}
              >
                <span className="flex items-center gap-2.5 font-bold">
                  <span
                    aria-hidden
                    className="flex size-7 flex-none items-center justify-center rounded-full border-2 border-[#166534] bg-white font-mono text-[12px] font-medium text-[#166534]"
                  >
                    {i + 1}
                  </span>
                  {r.t}
                </span>
                <span className="text-right text-[12px] text-soft">{r.d}</span>
              </li>
            ))}
          </ul>
          <div className="relative mt-auto overflow-hidden rounded-card bg-charcoal px-4 py-3.5 text-on-charcoal shadow-charcoal">
            <div aria-hidden className="dot-grid absolute inset-0" />
            <p className="relative text-[12.5px] leading-[1.5]">
              <span className="font-bold text-white">What-if: 20 bins</span>
              <span className="text-on-charcoal-quiet">, estimated change in demand within 150 m</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
