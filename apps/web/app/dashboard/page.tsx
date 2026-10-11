import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";

// Dashboard reads ?city= ?tab= ?sel= with useSearchParams, so it renders on the client
// inside a Suspense boundary.
export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="h-dvh animate-pulse bg-zinc-50 dark:bg-zinc-950" />}>
      <Dashboard />
    </Suspense>
  );
}
