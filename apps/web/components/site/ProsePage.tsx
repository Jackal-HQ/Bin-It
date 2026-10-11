// Prose page template (privacy, terms): nav, one glass card with an eyebrow and a large title,
// sections divided by dotted rules, then the footer. Daylight, light only.
import Link from "next/link";
import { SiteFooter } from "./SiteFooter";
import { SiteNav } from "./SiteNav";

export function ProsePage({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="daylight flex min-h-dvh flex-col font-ui antialiased">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-28 sm:px-6 sm:pt-32">
        <div className="rounded-card bg-glass px-6 py-10 shadow-card backdrop-blur-[24px] sm:px-12 sm:py-14">
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-full border border-rim bg-white/85 px-4 text-[13px] font-semibold text-soft transition-colors hover:bg-white hover:text-strong"
          >
            ← Home
          </Link>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.08em] text-quiet">{eyebrow}</p>
          <h1 className="mt-3 text-[40px] font-extrabold leading-[1.05] tracking-[-0.025em] sm:text-[56px]">{title}</h1>
          <p className="mt-3 text-[14px] text-quiet">{note}</p>
          <div className="mt-10">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function ProseSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t-2 border-dotted border-rim py-7 first:border-t-0 first:pt-0 last:pb-0">
      <h2 className="text-[20px] font-extrabold leading-[1.2] tracking-[-0.01em]">{title}</h2>
      <p className="mt-2.5 text-[16px] leading-[1.65] text-soft">{children}</p>
    </section>
  );
}

/** Emphasis inside prose: strong ink, never a color. */
export const Em = ({ children }: { children: React.ReactNode }) => <strong className="font-bold text-strong">{children}</strong>;

/** Inline link inside prose: ink with a sun underline. */
export function ProseLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-bold text-strong underline decoration-sun-deep decoration-2 underline-offset-4 transition-colors hover:bg-sun-wash">
      {children}
    </Link>
  );
}
