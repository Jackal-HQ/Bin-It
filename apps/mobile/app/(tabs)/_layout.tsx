import { Tabs } from "expo-router";
import { TabBar } from "@/components/TabBar";

// Screens draw their own headers (and the paper ground comes from the root), so the tab
// navigator has no header and a transparent scene.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
    >
      <Tabs.Screen name="index" options={{ title: "Report", tabBarLabel: "Report" }} />
      <Tabs.Screen name="nearby" options={{ title: "Nearby", tabBarLabel: "Nearby" }} />
    </Tabs>
  );
}
