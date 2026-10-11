// Floating pill tab bar (Daylight): a white pill over the ground with the active tab as a
// charcoal pill. Passed to expo-router's <Tabs tabBar={...}>.
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ComponentProps } from "react";
import type { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { colors, font, radius, shadow } from "@/lib/theme";
import type { IconName } from "@/components/ui";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

/** Space screens leave at the bottom so content clears the floating bar. */
export const TAB_BAR_SPACE = 92;

const ICONS: Record<string, { on: IconName; off: IconName }> = {
  index: { on: "camera", off: "camera-outline" },
  nearby: { on: "map-marker", off: "map-marker-outline" },
};

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 8) + 4 }]}>
      <View style={[styles.bar, shadow.float]}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const { options } = descriptors[route.key];
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : (options.title ?? route.name);
          const icon = ICONS[route.name] ?? ICONS.index;
          const color = focused ? "#FFFFFF" : colors.soft;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
              style={[styles.item, focused && styles.itemOn]}
            >
              <MaterialCommunityIcons name={focused ? icon.on : icon.off} size={20} color={color} />
              <Text style={{ fontFamily: focused ? font.ui700 : font.ui600, fontSize: 14, color }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16 },
  bar: { flexDirection: "row", gap: 6, padding: 6, borderRadius: radius.pill, backgroundColor: colors.float },
  item: { flex: 1, height: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: radius.pill },
  itemOn: { backgroundColor: colors.charcoal },
});
