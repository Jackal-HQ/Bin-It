// Shared city picker (themed chips). Used on both the Report and Nearby screens so
// the choice is identical and comes from the app-wide useCity() context.
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCity } from "@/lib/city";
import { useCities } from "@/lib/hooks";
import { useTheme, type Palette } from "@/lib/theme";

export function CitySelector({ compact = false }: { compact?: boolean }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { city, setCity } = useCity();
  const { data: cities } = useCities();

  const Row = (
    <View style={styles.row}>
      {(cities ?? []).map((c) => {
        const active = city === c.slug;
        return (
          <Pressable
            key={c.slug}
            onPress={() => setCity(c.slug)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {compact ? c.name.split(",")[0] : c.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // compact (map top bar) scrolls horizontally; full (form) wraps.
  return compact ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {Row}
    </ScrollView>
  ) : (
    Row
  );
}

function makeStyles(t: Palette) {
  return StyleSheet.create({
    scroll: { paddingHorizontal: 2 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: t.cardAlt,
    },
    chipActive: { backgroundColor: t.brand },
    chipText: { color: t.textMuted, fontSize: 13, fontWeight: "500" },
    chipTextActive: { color: t.brandFg, fontWeight: "700" },
  });
}
