import type { Metadata } from "next";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Dashboard · Bin-It",
  description: "Report queue, overflow-risk map, ranked new-bin sites and what-if scenarios for city staff.",
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <Providers>{children}</Providers>;
}
