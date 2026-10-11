// Daylight primitives for the mobile app (.claude/DESIGN.md, "Daylight guide"). They mirror the
// web recipes in apps/web/components/dash/ui.tsx: frosted-looking cards, pill controls, one
// charcoal action per view, LED severity dots and dot-matrix numerals.
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { colors, font, radius, severityColor, shadow } from "@/lib/theme";

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

// ---- ground ----

/** The paper gradient behind every screen. Put it at the root; screens stay transparent. */
export function Ground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={[colors.paper, colors.paperWarm, colors.paperSun]}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

// ---- type ----

type Variant = "title" | "heading" | "row" | "body" | "meta" | "eyebrow" | "chip" | "tile";

const VARIANT: Record<Variant, TextStyle> = {
  title: { fontFamily: font.ui800, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  heading: { fontFamily: font.ui800, fontSize: 21, lineHeight: 25, letterSpacing: -0.2 },
  row: { fontFamily: font.ui700, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: font.ui500, fontSize: 15, lineHeight: 22 },
  meta: { fontFamily: font.ui500, fontSize: 13, lineHeight: 18 },
  eyebrow: { fontFamily: font.mono500, fontSize: 11, lineHeight: 15, letterSpacing: 0.9, textTransform: "uppercase" },
  chip: { fontFamily: font.mono400, fontSize: 10, lineHeight: 14, letterSpacing: 0.7, textTransform: "uppercase" },
  tile: { fontFamily: font.mono400, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.85, textTransform: "uppercase" },
};

const QUIET: Variant[] = ["eyebrow", "chip", "tile"];

/** Text with a Daylight variant. Color defaults follow the variant: quiet labels, soft meta. */
export function T({ v = "body", color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  const base = VARIANT[v];
  const fallback = QUIET.includes(v) ? colors.quiet : v === "meta" ? colors.soft : colors.strong;
  return <Text {...rest} style={[base, { color: color ?? fallback }, style]} />;
}

/** Dot-matrix numerals (Doto, round dots). Numerals and the wordmark only. */
export function DotNum({ children, size = 46, color = colors.strong, style }: { children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      style={[{ fontFamily: font.dot, fontSize: size, lineHeight: Math.round(size * 1.12), color, letterSpacing: size * 0.02 }, style]}
      allowFontScaling={false}
    >
      {children}
    </Text>
  );
}

// ---- surfaces ----

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Recessed tile inside a card: mono label over a value. */
export function Tile({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tile, style]}>
      <T v="tile">{label}</T>
      <View style={styles.tileBody}>{children}</View>
    </View>
  );
}

/** Two-column grid of Tiles that stacks to one column when narrow. */
export function TileGrid({ children }: { children: ReactNode }) {
  return <View style={styles.tileGrid}>{children}</View>;
}

/** Estimates and caveats: sun at 20% with a dotted outline. */
export function Notice({ children }: { children: ReactNode }) {
  return <View style={styles.notice}>{children}</View>;
}

// ---- controls ----

type ButtonKind = "primary" | "secondary" | "ghost";

/** Pill button. `primary` is the one charcoal action per view (sun disc holds the icon). */
export function Button({
  kind = "secondary",
  label,
  icon,
  onPress,
  disabled,
  loading,
  compact,
  style,
  accessibilityLabel,
}: {
  kind?: ButtonKind;
  label: string;
  icon?: IconName;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const primary = kind === "primary";
  const height = primary ? (compact ? 44 : 52) : compact ? 40 : 46;
  const textColor = primary ? "#FFFFFF" : kind === "ghost" ? colors.soft : colors.strong;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { height },
        primary && [styles.btnPrimary, shadow.primary],
        kind === "secondary" && styles.btnSecondary,
        (disabled || loading) && { opacity: primary ? 0.4 : 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={primary ? "#FFFFFF" : colors.charcoal} />
      ) : icon ? (
        primary ? (
          <View style={styles.sunDisc}>
            <MaterialCommunityIcons name={icon} size={16} color={colors.strong} />
          </View>
        ) : (
          <MaterialCommunityIcons name={icon} size={18} color={textColor} />
        )
      ) : null}
      <Text style={{ fontFamily: primary ? font.ui700 : font.ui600, fontSize: primary ? 15 : 14, color: textColor, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  style,
}: {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.8 }, style]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={colors.soft} />
    </Pressable>
  );
}

/** Pill-shaped segmented group; selection is a charcoal pill. */
export function Segmented({
  options,
  value,
  onChange,
  fill = false,
  floating = false,
}: {
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  fill?: boolean;
  floating?: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.seg, floating ? [styles.segFloating, shadow.float] : styles.segFlat, fill ? { alignSelf: "stretch" } : { alignSelf: "flex-start" }]}
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={[styles.segItem, fill && { flex: 1 }, on && [styles.segOn, shadow.primary]]}
          >
            <Text style={{ fontFamily: on ? font.ui700 : font.ui600, fontSize: 14, color: on ? "#FFFFFF" : colors.soft }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {o.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---- chips ----

/** Seeded, synthetic rows. Dotted outline means illustrative. */
export function DemoChip() {
  return (
    <View style={styles.demoChip}>
      <T v="chip">Demo data</T>
    </View>
  );
}

const STATUS_STYLE = {
  received: { bg: "transparent", border: colors.rim, dot: "ring" as const, fg: colors.strong, dotColor: colors.soft },
  reviewed: { bg: colors.sunWash, border: "transparent", dot: "solid" as const, fg: colors.strong, dotColor: "#D9A21A" },
  resolved: { bg: colors.mossWash, border: "transparent", dot: "solid" as const, fg: "#1F5E3E", dotColor: colors.moss },
};

/** Status pill: hollow dot (pending), sun dot (reviewed), moss dot (resolved). */
export function StatusPill({ status, text }: { status: "received" | "reviewed" | "resolved" | undefined; text: string }) {
  const s = STATUS_STYLE[status ?? "received"];
  return (
    <View style={[styles.statusPill, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View
        style={
          s.dot === "ring"
            ? { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: s.dotColor }
            : { width: 8, height: 8, borderRadius: 4, backgroundColor: s.dotColor }
        }
      />
      <Text style={{ fontFamily: font.ui600, fontSize: 12.5, color: s.fg }}>{text}</Text>
    </View>
  );
}

/** Overlay chip for photos: dark glass with white text. */
export function OverlayChip({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.overlayChip, style]}>{children}</View>;
}

// ---- dots ----

/** Severity as LED dots: `severity` of 3 filled in the map's pin color. Sits beside the word. */
export function Led({ severity, size = 8, onDark = false }: { severity: number; size?: number; onDark?: boolean }) {
  const s = Math.max(0, Math.min(3, Math.round(severity)));
  const on = onDark && s === 3 ? "#FF7A6B" : severityColor(s);
  const off = onDark ? "rgba(255,255,255,0.3)" : colors.ledOff;
  return (
    <View style={styles.led} accessibilityElementsHidden importantForAccessibility="no">
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: i <= s ? on : off }} />
      ))}
    </View>
  );
}

/** The Bin-It mark: six dots round a coral center (a map cell with one thing flagged). */
export function HexMark({ size = 30 }: { size?: number }) {
  const k = size / 30;
  const dot = (cx: number, cy: number, r: number, color: string) => (
    <View
      key={`${cx}-${cy}`}
      style={{ position: "absolute", left: (cx - r) * k, top: (cy - r) * k, width: 2 * r * k, height: 2 * r * k, borderRadius: r * k, backgroundColor: color }}
    />
  );
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no">
      {[
        [24.5, 15],
        [19.75, 6.8],
        [10.25, 6.8],
        [5.5, 15],
        [10.25, 23.2],
        [19.75, 23.2],
      ].map(([cx, cy]) => dot(cx, cy, 3, colors.charcoal))}
      {dot(15, 15, 3.8, colors.coral)}
    </View>
  );
}

/** Hex mark + dot-matrix wordmark. */
export function Brand({ size = 26 }: { size?: number }) {
  return (
    <View style={styles.brand}>
      <HexMark size={size + 6} />
      <DotNum size={size}>
        Bin-It
      </DotNum>
    </View>
  );
}

// ---- photo ----

/** Report photo, or a sand placeholder when missing or broken. Children are overlays. */
export function Photo({
  uri,
  style,
  emptyText,
  iconSize = 28,
  children,
}: {
  uri?: string | null;
  style: StyleProp<ViewStyle>;
  emptyText?: string;
  iconSize?: number;
  children?: ReactNode;
}) {
  const [broken, setBroken] = useState<string | null>(null);
  const missing = !uri || broken === uri;
  return (
    <View style={[styles.photo, style]}>
      {missing ? (
        <LinearGradient colors={["#EADFC4", "#CDBF9D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.photoEmpty}>
          <MaterialCommunityIcons name="trash-can-outline" size={iconSize} color="rgba(30,29,26,0.5)" />
          {emptyText ? <T v="meta" color="rgba(30,29,26,0.6)" style={{ textAlign: "center", paddingHorizontal: 12 }}>{emptyText}</T> : null}
        </LinearGradient>
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBroken(uri)} />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: radius.card, backgroundColor: colors.card, padding: 16, ...shadow.card },
  tile: { flexGrow: 1, flexBasis: "45%", borderRadius: radius.tile, backgroundColor: colors.well, paddingHorizontal: 14, paddingVertical: 12 },
  tileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tileBody: { marginTop: 8 },
  notice: {
    borderRadius: radius.notice,
    borderWidth: 1.5,
    borderStyle: "dotted",
    borderColor: "rgba(201,148,16,0.5)",
    backgroundColor: "rgba(246,201,68,0.2)",
    padding: 16,
  },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 0, borderRadius: radius.pill, paddingHorizontal: 20 },
  btnPrimary: { backgroundColor: colors.charcoal, paddingLeft: 12 },
  btnSecondary: { backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: colors.rim, paddingHorizontal: 16 },
  sunDisc: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.sun, alignItems: "center", justifyContent: "center" },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.well, alignItems: "center", justifyContent: "center" },
  seg: { flexDirection: "row", gap: 4, padding: 4, borderRadius: radius.pill },
  segFlat: { backgroundColor: colors.well },
  segFloating: { backgroundColor: colors.float },
  segItem: { height: 40, minWidth: 0, flexShrink: 1, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segOn: { backgroundColor: colors.charcoal },
  demoChip: {
    height: 20,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderStyle: "dotted",
    borderColor: "rgba(110,107,98,0.45)",
    justifyContent: "center",
  },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 7, height: 30, paddingLeft: 10, paddingRight: 12, borderRadius: radius.pill, borderWidth: 1.5 },
  overlayChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: "rgba(30,29,26,0.66)",
  },
  led: { flexDirection: "row", gap: 3 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  photo: { overflow: "hidden" },
  photoEmpty: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 6 },
});
