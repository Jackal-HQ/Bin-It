// Floating glass nav for the marketing and legal pages (Daylight). The dashboard has its own bar.
import Link from "next/link";
import { HexMark } from "@/components/dash/icons";
import { btnPrimary } from "@/components/dash/ui";
import { cn } from "@/lib/utils";

export type NavLink = { href: string; label: string };

export function SiteNav({ links = [] }: { links?: NavLink[] }) {
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        aria-label="Site"
        className="flex w-full max-w-[760px] items-center justify-between gap-4 rounded-full bg-glass-strong py-2 pl-4 pr-2 shadow-float backdrop-blur-[24px]"
      >
        <Link href="/" aria-label="Bin-It home" className="flex items-center gap-2.5">
          <HexMark size={26} />
          <span className="dot-num text-[22px]">Bin-It</span>
        </Link>
        {links.length > 0 && (
          <div className="hidden items-center gap-6 sm:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-[13.5px] font-semibold text-soft transition-colors hover:text-strong">
                {l.label}
              </a>
            ))}
          </div>
        )}
        <Link href="/dashboard" className={cn(btnPrimary, "h-10 px-4 text-[13.5px]")}>
          Open dashboard
        </Link>
      </nav>
    </header>
  );
}
