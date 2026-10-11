import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

const YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: "Terms — Bin-It",
  description: "The terms for using Bin-It, a civic prototype for reporting overflowing bins.",
};

export default function TermsPage() {
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
          Terms of Use
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">
          Last updated {YEAR}.
        </p>

        <div className="mt-10 flex flex-col gap-8 text-base leading-7 text-zinc-700 dark:text-zinc-300">
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">What Bin-It is</h2>
            <p>
              Bin-It lets residents photo-report overflowing trash bins and helps city staff see
              where new bins would help most. It is a civic prototype provided as-is, without
              warranty of any kind.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Using the service</h2>
            <p>
              Report in good faith. Submit photos of actual trash and overflow conditions, not
              people. Do not upload content you do not have the right to share, and do not capture
              identifiable faces or license plates. Do not misuse the service to spam, harass, or
              submit knowingly false reports.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Your content</h2>
            <p>
              Because photos are served from public URLs for staff review, treat anything you
              submit as public. By submitting a report you allow it to be displayed in the product
              and used to estimate bin placement.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Estimates, not guarantees</h2>
            <p>
              Rankings and projected improvements are{" "}
              <span className="font-medium text-black dark:text-zinc-50">estimates</span> derived
              from models and objective proxies. They are decision-support, not a guarantee of any
              outcome, service level, or municipal action.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Availability</h2>
            <p>
              The service may change, pause, or be discontinued at any time. Reporting an issue in
              Bin-It is not a substitute for your city&apos;s official 311 or emergency services.
              For emergencies, call 911.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Privacy</h2>
            <p>
              See our{" "}
              <Link href="/privacy" className="font-medium text-brand hover:underline">
                Privacy notice
              </Link>{" "}
              for how data is handled.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
