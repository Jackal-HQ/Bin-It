// Shared city picker. The choice is app-wide via useCity(). A pill group (up to four cities,
// more scroll sideways). `fill` stretches it across a card; `floating` lifts it over the map.
import { ScrollView, StyleSheet, View } from "react-native";
import { useCity } from "@/lib/city";
import { useCities } from "@/lib/hooks";
import { colors, radius } from "@/lib/theme";
import { Segmented } from "@/components/ui";

const MAX_PILLS = 4;

export function CitySelector({ fill = false, floating = false }: { fill?: boolean; floating?: boolean }) {
  const { city, setCity } = useCity();
  const { data: cities } = useCities();
  const options = (cities ?? []).map((c) => ({
    id: c.slug,
    // short label (city name before the comma) so three fit without truncation
    name: c.name.split(",")[0],
  }));

  if (options.length === 0) return <View style={[styles.skeleton, fill && { alignSelf: "stretch" }]} />;

  const group = <Segmented options={options} value={city} onChange={setCity} fill={fill && options.length <= MAX_PILLS} floating={floating} />;
  if (options.length <= MAX_PILLS) return group;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {group}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  skeleton: { height: 48, width: 240, borderRadius: radius.pill, backgroundColor: colors.well },
  scroll: { paddingRight: 8 },
});
