import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CityProvider } from "@/lib/city";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <CityProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#166534" },
              headerTintColor: "#fff",
              headerTitleStyle: { fontWeight: "600" },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="report/[id]" options={{ title: "Report" }} />
          </Stack>
        </SafeAreaProvider>
      </CityProvider>
    </QueryClientProvider>
  );
}
