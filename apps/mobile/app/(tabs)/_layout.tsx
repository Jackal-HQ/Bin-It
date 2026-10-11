import { Tabs } from "expo-router";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from "@/lib/theme";

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.brand,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.bg, borderTopColor: t.border },
        headerStyle: { backgroundColor: t.headerBg },
        headerTintColor: t.headerFg,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Report",
          tabBarLabel: "Report",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "camera" : "camera-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: "Nearby",
          tabBarLabel: "Nearby",
          tabBarIcon: ({ color, size, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "map-marker" : "map-marker-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
