// Daylight design tokens for the mobile app. SOURCE OF TRUTH: .claude/DESIGN.md ("Daylight
// guide"); the values match apps/web/app/globals.css. Light only: there is no dark theme.
//
// React Native has no CSS variables or backdrop blur, so surfaces that are frosted on the web
// are near-opaque here, and shadows are the RN equivalents of the web shadow tokens.
import type { ViewStyle } from "react-native";

export const colors = {
  // ground: a 135 degree gradient behind every screen (see Ground in components/ui.tsx)
  paper: "#E9E8E3",
  paperWarm: "#F1EEE3",
  paperSun: "#F8EEBC",
  // text
  strong: "#1E1D1A",
  soft: "#57544C",
  quiet: "#6E6B62",
  // surfaces
  card: "#FBFAF5", // web: white 74% over the ground, flattened so Android shadows stay clean
  float: "#FEFDFA", // web: glass-strong; used over the map
  well: "rgba(60,52,28,0.06)",
  rim: "rgba(60,52,28,0.14)",
  ledOff: "rgba(60,52,28,0.16)",
  // charcoal: the one action and the result that matters
  charcoal: "#2A2926",
  charcoalRaised: "#3B3A36",
  onCharcoal: "#F6F3EA",
  onCharcoalQuiet: "#BDB9AC",
  // sun: selection and gain
  sun: "#F6C944",
  sunWash: "#FCEFC2",
  sunDeep: "#C99410",
  sunInk: "#4A3C0B",
  // signals
  coral: "#FF6363", // brand dot, errors. Never text
  coralWash: "#FFE7E3",
  coralInk: "#B8322B",
  moss: "#1F7A4F",
  mossWash: "#DDF2E4",
  pink: "#E7298A", // the map's under-reported outline
  pinkInk: "#9C1D5E",
  // map data colors: same as apps/web/lib/labels.ts, so phone and dashboard read as one
  sev: ["#9CA3AF", "#FDAE61", "#F46D43", "#A50026"] as const,
  bin: "#374151",
  site: "#166534",
} as const;

export const radius = {
  map: 32,
  card: 28,
  float: 26,
  notice: 24,
  row: 22,
  tile: 20,
  thumb: 18,
  pill: 999,
} as const;

// Font families are registered in app/_layout.tsx. With custom fonts React Native picks the
// face by family name, so there is one entry per weight and no fontWeight on text.
export const font = {
  ui400: "Manrope_400Regular",
  ui500: "Manrope_500Medium",
  ui600: "Manrope_600SemiBold",
  ui700: "Manrope_700Bold",
  ui800: "Manrope_800ExtraBold",
  mono400: "GeistMono_400Regular",
  mono500: "GeistMono_500Medium",
  // Doto Bold with round dots (a static instance of the variable font, assets/fonts/)
  dot: "DotoRound",
} as const;

const shade = "#463708";
export const shadow: Record<"card" | "float" | "primary", ViewStyle> = {
  card: { shadowColor: shade, shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 4 },
  float: { shadowColor: shade, shadowOpacity: 0.24, shadowRadius: 26, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  primary: { shadowColor: "#2A2926", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
};

/** Severity 0..3 to the map's pin color. */
export const severityColor = (s: number): string => colors.sev[Math.max(0, Math.min(3, Math.round(s)))];
export const severityText = (s: number): string => ["Clean", "Low", "Medium", "High"][Math.max(0, Math.min(3, Math.round(s)))];
