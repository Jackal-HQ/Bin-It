// Centralized colors + light/dark palettes. Screens call useTheme(), which follows
// the user's theme preference (System/Light/Dark via lib/themePref), defaulting to the
// OS appearance. The brand green matches the web app's accent.
import {
  MD3DarkTheme,
  MD3LightTheme,
  type MD3Theme,
} from "react-native-paper";
import { useResolvedScheme } from "@/lib/themePref";

export type Palette = {
  mode: "light" | "dark";
  brand: string;
  brandFg: string;
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  border: string;
  danger: string;
  // severity scale (shared with the map)
  sev1: string;
  sev2: string;
  sev3: string;
  bin: string;
  demoBg: string;
  demoFg: string;
  // header
  headerBg: string;
  headerFg: string;
};

const light: Palette = {
  mode: "light",
  brand: "#166534",
  brandFg: "#ffffff",
  bg: "#ffffff",
  card: "#f9fafb",
  cardAlt: "#f3f4f6",
  text: "#111827",
  textMuted: "#6b7280",
  border: "#e5e7eb",
  danger: "#b91c1c",
  sev1: "#eab308",
  sev2: "#f97316",
  sev3: "#dc2626",
  bin: "#16a34a",
  demoBg: "#fef3c7",
  demoFg: "#92400e",
  headerBg: "#166534",
  headerFg: "#ffffff",
};

const dark: Palette = {
  mode: "dark",
  brand: "#22c55e",
  brandFg: "#052e16",
  bg: "#0a0a0a",
  card: "#141414",
  cardAlt: "#1f1f1f",
  text: "#f3f4f6",
  textMuted: "#9ca3af",
  border: "#262626",
  danger: "#f87171",
  sev1: "#eab308",
  sev2: "#fb923c",
  sev3: "#ef4444",
  bin: "#22c55e",
  demoBg: "#422006",
  demoFg: "#fcd34d",
  headerBg: "#0f3d22",
  headerFg: "#f3f4f6",
};

export function useTheme(): Palette {
  return useResolvedScheme() === "dark" ? dark : light;
}

export const palettes = { light, dark };

// Build a React Native Paper MD3 theme from our palette so Paper components inherit
// the brand green + dark mode with no duplication.
function paperTheme(p: Palette): MD3Theme {
  const base = p.mode === "dark" ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    dark: p.mode === "dark",
    colors: {
      ...base.colors,
      primary: p.brand,
      onPrimary: p.brandFg,
      secondary: p.brand,
      onSecondary: p.brandFg,
      background: p.bg,
      onBackground: p.text,
      surface: p.bg,
      onSurface: p.text,
      surfaceVariant: p.cardAlt,
      onSurfaceVariant: p.textMuted,
      outline: p.border,
      outlineVariant: p.border,
      error: p.danger,
      elevation: {
        ...base.colors.elevation,
        level0: "transparent",
        level1: p.card,
        level2: p.card,
        level3: p.cardAlt,
        level4: p.cardAlt,
        level5: p.cardAlt,
      },
    },
  };
}

export function usePaperTheme(): MD3Theme {
  return paperTheme(useTheme());
}
