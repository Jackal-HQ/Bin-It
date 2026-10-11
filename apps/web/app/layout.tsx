import type { Metadata } from "next";
import { Doto, Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Daylight (.claude/DESIGN.md): Manrope for everything readable, Doto (dot-matrix, ROND axis
// for round dots) for numerals and the wordmark. Geist Mono stays the label face.
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
      className={`${geistMono.variable} ${manrope.variable} ${doto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
