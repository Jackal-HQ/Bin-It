// A recreated dashboard window for the hero (DESIGN.md "App Window Mockup"). The layout is
// real (queue / map / bins tabs); the hex map is illustrative and the two distances come from
// our current Orlando model run.
import { HexGrid } from "@/components/landing/HexGrid";

const KEY_SHADOW =
  "rgba(255,255,255,0.05) 0px 1px 0px 0px inset, rgba(255,255,255,0.25) 0px 0px 0px 1px, rgba(0,0,0,0.2) 0px -1px 0px 0px inset";

const ROWS = [
  { t: "Site 1", d: "6,095 m to nearest bin", active: true },
  { t: "Site 2", d: "434 m to nearest bin", active: false },
  { t: "Site 3", d: "ranked by demand served", active: false },
  { t: "Site 4", d: "ranked by demand served", active: false },
];

export function ProductWindow() {
  return (
    <div
      className="mx-auto w-full max-w-[1000px] rounded-[12px] bg-ink p-2"
      style={{ boxShadow: KEY_SHADOW }}
    >
      <div className="flex items-center justify-between gap-3 rounded-[10px] bg-obsidian px-4 py-3">
        <div className="flex items-center gap-2 text-[14px] text-ash">
          <span aria-hidden className="h-2 w-2 rotate-45 rounded-[2px] bg-coral-pulse" />
          <span className="text-white">Orlando</span>
          <span className="text-smoke">·</span>
          <span>Add top 20 recommended bins</span>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          {["Queue", "Map", "Bins"].map((t, i) => (
            <span
              key={t}
              className={`rounded-[6px] px-2 py-1 text-[12px] ${
                i === 2 ? "bg-graphite text-white" : "text-smoke"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-[1.5fr_1fr]">
        <div className="relative overflow-hidden rounded-[10px] bg-void-black p-3 pb-8">
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
          <p className="absolute bottom-2 left-3 font-mono text-[10px] text-smoke">
            Illustrative: coral = expected overflow, dashed = under-reported
          </p>
        </div>
        <ul className="flex flex-col gap-1 rounded-[10px] bg-void-black p-2">
          {ROWS.map((r) => (
            <li
              key={r.t}
              className={`flex items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 text-[13px] ${
                r.active ? "bg-coral-pulse/15 text-white" : "text-ash"
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${r.active ? "bg-coral-pulse" : "bg-smoke"}`}
                />
                {r.t}
              </span>
              <span className="text-right text-[12px] text-smoke">{r.d}</span>
            </li>
          ))}
          <li className="mt-auto rounded-[8px] border border-rc-border px-3 py-2.5 text-[12px] text-ash">
            What-if: 20 bins, estimated change in demand within 150 m
          </li>
        </ul>
      </div>
    </div>
  );
}
