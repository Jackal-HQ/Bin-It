// "How it works" as a bento: report, rank, place, and the reporting-bias idea.
import { DotBar } from "@/components/dash/ui";
import { HexGrid } from "@/components/landing/HexGrid";
import { SpotlightCard } from "@/components/landing/SpotlightCard";

const Eyebrow = ({ children }: { children: string }) => (
  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-quiet">{children}</p>
);

/** Neutral chips on a well; the "sun" tone marks the outcome (a merged ticket); pink marks under-reported. */
const Chip = ({ children, tone = "neutral" }: { children: string; tone?: "neutral" | "sun" | "pink" }) => {
  if (tone === "sun")
    return (
      <span className="inline-flex h-[26px] items-center gap-2 rounded-full bg-sun-wash px-3 font-mono text-[11px] text-sun-ink">
        <span className="size-[7px] rounded-full bg-sun ring-1 ring-sun-deep" />
        {children}
      </span>
    );
  if (tone === "pink")
    return (
      <span className="inline-flex h-[22px] items-center rounded-full border-[1.5px] border-dashed border-[#E7298A] px-2.5 font-mono text-[10px] uppercase tracking-[0.07em] text-pink-ink">
        {children}
      </span>
    );
  return <span className="inline-flex h-[26px] items-center rounded-full bg-well px-3 font-mono text-[11px] text-soft">{children}</span>;
};

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-3 text-[24px] font-extrabold leading-[1.15] tracking-[-0.015em]">{children}</h3>
);

const DOTS = 20;

const SITES = [
  { n: 1, dots: 20 },
  { n: 2, dots: 18 },
  { n: 3, dots: 14 },
  { n: 4, dots: 12 },
];

const AREAS = [
  { name: "Area A", expected: 16, reported: 14, flag: false },
  { name: "Area B", expected: 15, reported: 4, flag: true },
];

export function Bento() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 1 Report */}
      <SpotlightCard className="md:col-span-2">
        <Eyebrow>01 · Report</Eyebrow>
        <H3>A photo becomes a ticket.</H3>
        <p className="mt-2 max-w-md text-[16px] leading-[1.55] text-soft">
          Residents photograph an overflowing bin. The photo is classified, scored for severity and
          merged with reports of the same spot, so staff see one ticket and not ten.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Chip>photo</Chip>
          <span aria-hidden className="text-quiet">
            →
          </span>
          <Chip>overflowing_can</Chip>
          <Chip>severity 3</Chip>
          <span aria-hidden className="text-quiet">
            →
          </span>
          <Chip tone="sun">merged into 1 ticket · 5 reports</Chip>
        </div>
      </SpotlightCard>

      {/* 2 Rank */}
      <SpotlightCard>
        <Eyebrow>02 · Rank</Eyebrow>
        <H3>Expected, not just reported.</H3>
        <div className="mt-4 h-[120px] overflow-hidden rounded-tile bg-[#f4f0e8]">
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
        <p className="mt-3 text-[14px] leading-[1.6] text-soft">
          Hexagons score expected overflow from places, transit and nearby bins.
        </p>
      </SpotlightCard>

      {/* 3 Place */}
      <SpotlightCard>
        <Eyebrow>03 · Place</Eyebrow>
        <H3>Sites ranked by coverage gain.</H3>
        <ul className="mt-4 flex flex-col gap-2.5">
          {SITES.map((s) => (
            <li key={s.n} className="flex items-center gap-3">
              <span className="flex size-7 flex-none items-center justify-center rounded-full border-2 border-[#166534] bg-white font-mono text-[12px] font-medium text-[#166534]">
                {s.n}
              </span>
              <DotBar filled={s.dots} total={DOTS} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[14px] leading-[1.6] text-soft">
          Greedy picks the site that serves the most demand next, with a reason for each.
        </p>
      </SpotlightCard>

      {/* 4 Bias */}
      <SpotlightCard className="md:col-span-2">
        <Eyebrow>Why it matters</Eyebrow>
        <H3>Complaint counts show who calls, not where the trash is.</H3>
        <p className="mt-2 max-w-lg text-[16px] leading-[1.55] text-soft">
          Two areas can have the same overflow and very different reporting. Bin-It flags the quiet
          one, so the plan does not only serve the neighborhoods that already speak up.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {AREAS.map((a) => (
            <div key={a.name} className="rounded-tile bg-well p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-bold">{a.name}</span>
                {a.flag && <Chip tone="pink">under-reported</Chip>}
              </div>
              <p className="mb-1.5 mt-3.5 font-mono text-[11px] text-quiet">Expected overflow</p>
              <DotBar filled={a.expected} total={DOTS} />
              <p className="mb-1.5 mt-3.5 font-mono text-[11px] text-quiet">Reports</p>
              <DotBar filled={a.reported} total={DOTS} tone="sun" />
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] text-quiet">Illustrative bars for the idea, not measured data.</p>
      </SpotlightCard>
    </div>
  );
}
