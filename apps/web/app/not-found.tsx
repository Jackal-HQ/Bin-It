import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-void-black px-6 text-center antialiased">
      {/* subtle atmospheric wash, consistent with the landing hero */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,99,99,0.08),transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center">
        <span className="mb-6 flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rotate-45 rounded-[2px] bg-coral-pulse" />
          <span className="text-[13px] font-medium text-white">Bin-It</span>
        </span>

        <p className="font-mono text-[64px] font-normal leading-none text-white">404</p>
        <h1 className="mt-4 text-[24px] font-normal tracking-[0.2px] text-white">
          This bin&apos;s <span className="text-coral-pulse">empty</span>.
        </h1>
        <p className="mt-3 max-w-sm text-[16px] leading-[1.5] text-ash">
          The page you&apos;re looking for isn&apos;t here. It may have been moved, or the
          link is wrong.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex h-11 items-center justify-center rounded-[8px] bg-mist px-5 text-[14px] font-medium text-iron transition-opacity hover:opacity-90"
          >
            Back home
          </Link>
          <Link
            href="/dashboard"
            className="flex h-11 items-center justify-center rounded-[8px] border border-rc-border px-5 text-[14px] font-medium text-ash transition-colors hover:text-white"
          >
            Open dashboard
          </Link>
        </div>

        <p className="mt-10 font-mono text-[12px] tracking-[0.017em] text-smoke">
          HTTP 404&nbsp;&nbsp;|&nbsp;&nbsp;not found
        </p>
      </div>
    </div>
  );
}
