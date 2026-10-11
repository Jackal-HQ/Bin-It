import type { Metadata } from "next";
import { Doto, Geist, Geist_Mono, Inter, Manrope } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Inter stands in for Roobert (the landing page's editorial typeface).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

// Daylight (.claude/DESIGN.md): Manrope for everything readable, Doto (dot-matrix, ROND axis
// for round dots) for numerals and the wordmark. Geist Mono above stays the label face.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  axes: ["ROND"],
});

export const metadata: Metadata = {
  title: "Bin-It — Trash Overflow Planner",
  description:
    "Residents photo-report overflowing trash bins; city staff see where new bins would help most.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${manrope.variable} ${doto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
