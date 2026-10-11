// Centralized colors + light/dark palettes. Screens call useTheme(), which follows
// the user's theme preference (System/Light/Dark via lib/themePref), defaulting to the
// OS appearance.
//
// SOURCE OF TRUTH: .claude/DESIGN.md (the Raycast "midnight command center, coral neon"
// system also used by the web landing page). Dark is the canonical Raycast look
// (void-black canvas #040506, coral accent #ff6363, Raycast neutrals). Light is an
// on-brand counterpart that keeps the same coral accent so the theme toggle still works.
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

// Coral is the single accent across the whole product (DESIGN.md: Coral Pulse #ff6363).
const CORAL = "#ff6363";

const light: Palette = {
  mode: "light",
  brand: CORAL,
  brandFg: "#ffffff",
  bg: "#ffffff",
  card: "#f7f7f8",
  cardAlt: "#eeeeef",
  text: "#040506",
  textMuted: "#6a6b6c",
  border: "#e4e4e6",
  danger: "#c2410c",
  // keep severity semantic (warm scale) but tuned to the system
  sev1: "#eab308",
  sev2: "#f97316",
  sev3: "#dc2626",
  bin: "#59d499", // DESIGN.md Success Green, used only as a map accent
  demoBg: "#452324", // Ember Hush tint
  demoFg: "#ff6363",
  headerBg: "#040506",
  headerFg: "#ffffff",
};

const dark: Palette = {
  mode: "dark",
  brand: CORAL,
  brandFg: "#ffffff",
  bg: "#040506", // Void Black — the canonical Raycast canvas
  card: "#07080a", // Ink
  cardAlt: "#111214", // Obsidian
  text: "#ffffff", // Pure White
  textMuted: "#9c9c9d", // Ash
  border: "#363739", // Raycast hairline border
  danger: "#ff6363",
  sev1: "#eab308",
  sev2: "#fb923c",
  sev3: "#ef4444",
  bin: "#59d499", // Success Green
  demoBg: "#452324", // Ember Hush
  demoFg: "#ff8f8f",
  headerBg: "#040506",
  headerFg: "#ffffff",
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
