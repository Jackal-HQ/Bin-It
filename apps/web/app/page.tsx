export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col justify-between gap-16 bg-white px-16 py-32 dark:bg-black">
        {/* wordmark */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-brand-fg"
          >
            B
          </span>
          <span className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
            Bin-It
          </span>
          <span className="rounded-full bg-black/[.06] px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/[.08] dark:text-zinc-400">
            Trash Overflow Planner
          </span>
        </div>

        {/* hero */}
        <div className="flex flex-col gap-6">
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
            See where new trash bins would{" "}
            <span className="text-brand">help most</span>.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Residents photo-report overflowing bins from their phones. Staff get a
            dashboard that corrects for reporting bias and ranks the best places to add
            bins — shown as{" "}
            <span className="font-medium text-zinc-950 dark:text-zinc-50">estimates</span>,
            never measured outcomes.
          </p>

          <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
            <a
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-brand-fg transition-colors hover:opacity-90 md:w-[180px]"
              href="/dashboard"
            >
              Open dashboard
            </a>
            <a
              className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[180px]"
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              API contract
            </a>
          </div>
        </div>

        {/* how it works */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
            How it works
          </p>
          <ol className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            {[
              { n: "1", t: "Report", d: "A resident snaps an overflowing bin; it's classified and deduped." },
              { n: "2", t: "Rank", d: "Expected overflow is compared to reports to flag under-reported areas." },
              { n: "3", t: "Place", d: "Greedy coverage picks the best new bin sites and runs what-if scenarios." },
            ].map((s) => (
              <li
                key={s.n}
                className="flex-1 rounded-xl border border-black/[.06] bg-zinc-50 p-4 dark:border-white/[.08] dark:bg-[#111]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {s.n}
                </span>
                <p className="mt-2.5 text-sm font-semibold text-black dark:text-zinc-50">
                  {s.t}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {s.d}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* footer line */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 dark:text-zinc-500">
          <span>Orlando, FL</span>
          <span aria-hidden className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>ports to NYC &amp; Chicago by config</span>
          <span aria-hidden className="text-zinc-300 dark:text-zinc-700">·</span>
          <span>Neon · Hugging Face · Databricks</span>
        </div>
      </main>
    </div>
  );
}
