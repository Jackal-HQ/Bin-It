import Link from "next/link";
import { LogoMark } from "@/components/dash/LogoMark";
import { btnPrimary, btnSecondary } from "@/components/dash/ui";
import { SiteFooter } from "@/components/site/SiteFooter";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="daylight relative flex min-h-dvh flex-col overflow-hidden font-ui antialiased">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[8%] h-[380px] w-[720px] max-w-none -translate-x-1/2 rounded-full bg-sun/40 blur-[100px]"
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Link href="/" aria-label="Bin-It home" className="mb-8 flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="dot-num text-[24px]">Bin-It</span>
        </Link>

        <p className="dot-num text-[96px] sm:text-[128px]">404</p>
        <h1 className="mt-6 text-[28px] font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-[34px]">
          This bin&apos;s <span className="box-decoration-clone rounded-[12px] bg-sun px-2">empty</span>.
        </h1>
        <p className="mt-3 max-w-sm text-[16px] leading-[1.55] text-soft">
          The page you&apos;re looking for isn&apos;t here. It may have been moved, or the link is wrong.
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
          <Link href="/" className={btnPrimary}>
            Back home
          </Link>
          <Link href="/dashboard" className={cn(btnSecondary, "h-12 px-6 text-[14px]")}>
            Open dashboard
          </Link>
        </div>

        <p className="mt-10 font-mono text-[12px] text-quiet">HTTP 404&nbsp;&nbsp;·&nbsp;&nbsp;not found</p>
      </main>
      <SiteFooter />
    </div>
  );
}
