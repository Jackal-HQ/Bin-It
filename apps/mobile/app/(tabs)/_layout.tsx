import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { useTheme } from "@/lib/theme";

function TabIcon({ icon, color }: { icon: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}

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
          tabBarIcon: ({ color }) => <TabIcon icon="📷" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          title: "Nearby",
          tabBarLabel: "Nearby",
          tabBarIcon: ({ color }) => <TabIcon icon="🗺️" color={color} />,
        }}
      />
    </Tabs>
  );
}
