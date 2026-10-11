// Shared footer for the marketing and legal pages: one mono meta strip on a glass pill.
import Link from "next/link";

const YEAR = new Date().getFullYear();

const link = "transition-colors hover:text-strong";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto px-4 pb-6 pt-2">
      <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full bg-white/55 px-5 py-3 font-mono text-[12px] text-quiet backdrop-blur-[16px]">
        <span>© {YEAR} Bin-It</span>
        <span aria-hidden>·</span>
        <Link href="/privacy" className={link}>
          Privacy
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className={link}>
          Terms
        </Link>
        <span aria-hidden>·</span>
        <Link href="/dashboard" className={link}>
          Dashboard
        </Link>
      </div>
    </footer>
  );
}
