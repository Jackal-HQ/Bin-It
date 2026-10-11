import { ApiError } from "@/lib/api";
import { Tooltip } from "@/components/ui/tooltip-card";
import { BinIcon, DotSpinner, HexOutline } from "@/components/dash/icons";
import { btnSecondary } from "@/components/dash/ui";

export function Loading({ what }: { what: string }) {
  return (
    <div role="status" className="m-3 flex items-center gap-3 rounded-[20px] bg-well px-4 py-3.5 text-[14px] font-medium text-soft">
      <DotSpinner className="text-charcoal" />
      Loading {what}…
    </div>
  );
}

/** Empty list: a dotted block with an optional action (for example, clearing filters). */
export function Empty({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="m-3 flex flex-col items-center gap-3 rounded-notice border-[1.5px] border-dotted border-rim px-4 py-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-well text-quiet">
        <BinIcon size={26} />
      </span>
      <p className="text-[14px] font-semibold text-strong">{children}</p>
      {action}
    </div>
  );
}

export function ErrorRetry({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div
      role="alert"
      className="m-3 flex items-start gap-3 rounded-[22px] border-[1.5px] border-coral-pulse/50 bg-coral-wash px-4 py-3.5"
    >
      <span className="flex size-7 flex-none items-center justify-center rounded-full bg-coral-pulse text-[15px] font-extrabold text-white">
        !
      </span>
      <div className="min-w-0">
        <p className="mt-0.5 text-[14px] font-semibold leading-[1.5] text-[#5a1f1a]">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className={`${btnSecondary} mt-2.5 h-[34px] px-4 text-[13px]`}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

/** Seeded, synthetic rows. Dotted outline means illustrative. */
export function DemoBadge() {
  return (
    <Tooltip
      content="Seeded demo data. These reports are synthetic and do not come from real residents."
      containerClassName="inline-flex"
    >
      <span className="inline-flex h-5 items-center rounded-full border-[1.5px] border-dotted border-quiet/45 px-2 font-mono text-[10px] uppercase tracking-[0.07em] text-quiet">
        Demo data
      </span>
    </Tooltip>
  );
}

/** Pink dashed outline: the same pink as the under-reported hexagons on the map. */
export function UnderReportedBadge() {
  return (
    <Tooltip
      content="The model expects a lot of litter here, but residents report little of it. Reports alone would miss this area."
      containerClassName="inline-flex"
    >
      <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-[#E7298A] pl-2 pr-2.5 font-mono text-[10px] uppercase tracking-[0.07em] text-pink-ink">
        <HexOutline size={11} stroke={2.6} />
        Under-reported area
      </span>
    </Tooltip>
  );
}
