import { ApiError } from "@/lib/api";

export function Loading({ what }: { what: string }) {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-zinc-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-brand" />
      Loading {what}…
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-4 text-sm text-zinc-500">{children}</div>;
}

export function ErrorRetry({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return (
    <div className="m-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded border border-red-300 px-2 py-0.5 text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900">
          Retry
        </button>
      )}
    </div>
  );
}

export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;

export function DemoBadge() {
  return (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900 dark:text-amber-100">
      Demo data
    </span>
  );
}

export function UnderReportedBadge() {
  return (
    <span className="rounded border border-pink-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pink-700 dark:text-pink-300">
      Under-reported area
    </span>
  );
}
