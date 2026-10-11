// "How it works" as a bento: report, rank, place, and the reporting-bias idea.
import { HexGrid } from "@/components/landing/HexGrid";
import { SpotlightCard } from "@/components/landing/SpotlightCard";

const Eyebrow = ({ children }: { children: string }) => (
  <p className="font-mono text-[11px] uppercase tracking-[0.073em] text-smoke">{children}</p>
);

const Chip = ({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "coral" }) => (
  <span
    className={`rounded-[6px] px-2 py-1 font-mono text-[11px] ${
      tone === "coral" ? "bg-coral-pulse/15 text-coral-pulse" : "bg-graphite text-ash"
    }`}
  >
    {children}
  </span>
);

const SITES = [
  { n: 1, w: "100%" },
  { n: 2, w: "88%" },
  { n: 3, w: "71%" },
  { n: 4, w: "58%" },
];

const AREAS = [
  { name: "Area A", expected: "78%", reported: "70%", flag: false },
  { name: "Area B", expected: "74%", reported: "18%", flag: true },
];

export function Bento() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 1 Report */}
      <SpotlightCard className="md:col-span-2">
        <Eyebrow>01 · Report</Eyebrow>
        <h3 className="mt-3 text-[24px] font-normal leading-[1.15]">A photo becomes a ticket.</h3>
        <p className="mt-2 max-w-md text-[16px] leading-[1.5] text-ash">
          Residents photograph an overflowing bin. The photo is classified, scored for severity and
          merged with reports of the same spot, so staff see one ticket and not ten.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Chip>photo</Chip>
          <span aria-hidden className="text-smoke">
            →
          </span>
          <Chip>overflowing_can</Chip>
          <Chip>severity 3</Chip>
          <span aria-hidden className="text-smoke">
            →
          </span>
          <Chip tone="coral">merged into 1 ticket · 5 reports</Chip>
        </div>
      </SpotlightCard>

      {/* 2 Rank */}
      <SpotlightCard>
        <Eyebrow>02 · Rank</Eyebrow>
        <h3 className="mt-3 text-[24px] font-normal leading-[1.15]">Expected, not just reported.</h3>
        <div className="mt-4 h-[120px] overflow-hidden rounded-[8px] bg-void-black p-2">
          <HexGrid
            cover
            cols={9}
            rows={5}
            seed={4.1}
            flags={[
              [3, 2],
              [6, 3],
            ]}
          />
        </div>
        <p className="mt-3 text-[14px] leading-[1.6] text-ash">
          Hexagons score expected overflow from places, transit and nearby bins.
        </p>
      </SpotlightCard>

      {/* 3 Place */}
      <SpotlightCard>
        <Eyebrow>03 · Place</Eyebrow>
        <h3 className="mt-3 text-[24px] font-normal leading-[1.15]">Sites ranked by coverage gain.</h3>
        <ul className="mt-4 flex flex-col gap-2">
          {SITES.map((s) => (
            <li key={s.n} className="flex items-center gap-3">
              <span className="w-4 font-mono text-[11px] text-smoke">{s.n}</span>
              <span className="h-2 flex-1 rounded-full bg-graphite">
                <span className="block h-2 rounded-full bg-mist/80" style={{ width: s.w }} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] leading-[1.6] text-ash">
          Greedy picks the site that serves the most demand next, with a reason for each.
        </p>
      </SpotlightCard>

      {/* 4 Bias */}
      <SpotlightCard className="md:col-span-2">
        <Eyebrow>Why it matters</Eyebrow>
        <h3 className="mt-3 text-[24px] font-normal leading-[1.15]">
          Complaint counts show who calls, not where the trash is.
        </h3>
        <p className="mt-2 max-w-lg text-[16px] leading-[1.5] text-ash">
          Two areas can have the same overflow and very different reporting. Bin-It flags the quiet
          one, so the plan does not only serve the neighborhoods that already speak up.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {AREAS.map((a) => (
            <div key={a.name} className="rounded-[8px] border border-rc-border p-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-white">{a.name}</span>
                {a.flag && <Chip tone="coral">under-reported</Chip>}
              </div>
              {[
                { l: "Expected overflow", w: a.expected, c: "bg-mist/80" },
                { l: "Reports", w: a.reported, c: "bg-coral-pulse" },
              ].map((b) => (
                <div key={b.l} className="mt-3">
                  <p className="mb-1 font-mono text-[11px] text-smoke">{b.l}</p>
                  <span className="block h-2 rounded-full bg-graphite">
                    <span className={`block h-2 rounded-full ${b.c}`} style={{ width: b.w }} />
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] text-smoke">
          Illustrative bars for the idea, not measured data.
        </p>
      </SpotlightCard>
    </div>
  );
}
