import Link from "next/link";

const YEAR = new Date().getFullYear();

// Shared site footer. Links the legal pages and repeats the project tagline.
// Mobile-first: stacks on small screens, row on >= sm.
export function SiteFooter() {
  return (
    <footer className="border-t border-black/[.06] bg-zinc-50 dark:border-white/[.08] dark:bg-black">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-6 py-6 text-sm text-zinc-500 dark:text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-16">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-5 w-5 items-center justify-center rounded bg-brand text-[10px] font-bold text-brand-fg"
          >
            B
          </span>
          <span>© {YEAR} Bin-It</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-black dark:hover:text-zinc-50">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-black dark:hover:text-zinc-50">
            Terms
          </Link>
          <Link href="/dashboard" className="hover:text-black dark:hover:text-zinc-50">
            Dashboard
          </Link>
        </nav>
      </div>
    </footer>
  );
}
