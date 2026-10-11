// Shared city picker. The choice is app-wide via useCity(). Two variants so it fits
// each surface:
//   variant="segmented" (default) — Paper SegmentedButtons, for the Report form.
//   variant="menu" — a compact dropdown Button + Menu, for the Nearby map top bar.
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Menu, SegmentedButtons } from "react-native-paper";
import { useCity } from "@/lib/city";
import { useCities } from "@/lib/hooks";

export function CitySelector({
  variant = "segmented",
}: {
  variant?: "segmented" | "menu";
}) {
  const { city, setCity } = useCity();
  const { data: cities } = useCities();
  const list = cities ?? [];
  const current = list.find((c) => c.slug === city);
  const [open, setOpen] = useState(false);

  if (variant === "menu") {
    return (
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <Button
            mode="elevated"
            icon="map-marker"
            onPress={() => setOpen(true)}
            contentStyle={styles.menuBtnContent}
            compact
          >
            {current ? current.name.split(",")[0] : "City"}
          </Button>
        }
      >
        {list.map((c) => (
          <Menu.Item
            key={c.slug}
            title={c.name}
            trailingIcon={c.slug === city ? "check" : undefined}
            onPress={() => {
              setCity(c.slug);
              setOpen(false);
            }}
          />
        ))}
      </Menu>
    );
  }

  // segmented (form)
  return (
    <View style={styles.wrap}>
      <SegmentedButtons
        value={city}
        onValueChange={setCity}
        buttons={list.map((c) => ({
          value: c.slug,
          // short label (city name before the comma) so three fit without truncation
          label: c.name.split(",")[0],
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  menuBtnContent: { flexDirection: "row-reverse" },
});
