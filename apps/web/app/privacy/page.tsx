import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

const YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: "Privacy — Bin-It",
  description: "How Bin-It handles photos, location, and the fact that it uses no accounts.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 bg-white px-6 py-16 dark:bg-black sm:px-16 sm:py-24">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-zinc-50"
        >
          ← Back
        </Link>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50 sm:text-4xl">
          Privacy
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          How Bin-It handles your data. Last updated {YEAR}.
        </p>

        <div className="mt-10 flex flex-col gap-8 text-base leading-7 text-zinc-700 dark:text-zinc-300">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">No accounts, no names</h2>
            <p>
              Bin-It has no sign-up and never asks for your name, email, or phone number. The
              mobile app stores a random anonymous device identifier on your phone so duplicate
              reports can be grouped; it is not tied to your identity and never leaves your device
              except as an opaque token on your own reports.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Photos</h2>
            <p>
              A report includes a photo you take or choose. Photos are stored and served from
              public URLs so city staff can review them, so treat them as public. We strip camera
              metadata (EXIF) before publishing, except the coordinates needed to place the report
              on the map. Please avoid capturing identifiable faces or license plates.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Location</h2>
            <p>
              Each report is tagged with the location where it was taken, so staff know where the
              overflow is. The app only reads your location while you are using it and only to
              attach it to a report.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Demo data</h2>
            <p>
              Some reports shown in the product are synthetic seed data used for demonstrations.
              These are clearly labeled &ldquo;demo data&rdquo; in the interface and are never
              presented as real resident reports.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">What we do not do</h2>
            <p>
              We do not sell data, run third-party advertising trackers, or build profiles of
              individuals. Reports are used to estimate where new bins would help most; projected
              improvements are shown as <span className="font-medium text-black dark:text-zinc-50">estimates</span>,
              never measured outcomes.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Contact</h2>
            <p>
              Bin-It is a civic prototype. For questions about a specific report or this notice,
              contact your city&apos;s sanitation or 311 service.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
