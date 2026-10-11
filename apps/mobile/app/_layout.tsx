import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CityProvider } from "@/lib/city";
import { useTheme } from "@/lib/theme";

const queryClient = new QueryClient();

export default function RootLayout() {
  const t = useTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <CityProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: t.headerBg },
              headerTintColor: t.headerFg,
              headerTitleStyle: { fontWeight: "600" },
              contentStyle: { backgroundColor: t.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="report/[id]" options={{ title: "Report" }} />
            <Stack.Screen name="ticket/[id]" options={{ title: "Report" }} />
          </Stack>
        </SafeAreaProvider>
      </CityProvider>
    </QueryClientProvider>
  );
}
