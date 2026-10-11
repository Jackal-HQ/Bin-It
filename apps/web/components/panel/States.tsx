import { ApiError } from "@/lib/api";
import { Tooltip } from "@/components/ui/tooltip-card";

export function Loading({ what }: { what: string }) {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-ash" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-rc-border border-t-mist" />
      Loading {what}…
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-4 text-sm text-ash">{children}</div>;
}

export function ErrorRetry({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="m-3 rounded-[12px] border border-coral-pulse/30 bg-ember-hush/60 p-3 text-sm text-white" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-[8px] border border-rc-border px-2.5 py-1 text-xs font-medium text-ash transition-colors hover:text-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

export function DemoBadge() {
  return (
    <Tooltip
      content="Seeded demo data. These reports are synthetic and do not come from real residents."
      containerClassName="inline-flex"
    >
      <span className="rounded-[6px] bg-graphite px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.073em] text-ash">
        Demo data
      </span>
    </Tooltip>
  );
}

export function UnderReportedBadge() {
  return (
    <Tooltip
      content="The model expects a lot of litter here, but residents report little of it. Reports alone would miss this area."
      containerClassName="inline-flex"
    >
      <span className="rounded-[6px] border border-dashed border-white/60 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.073em] text-white">
        Under-reported area
      </span>
    </Tooltip>
  );
}
