import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";

function TabIcon({ icon, color }: { icon: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#166534",
        headerStyle: { backgroundColor: "#166534" },
        headerTintColor: "#fff",
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
