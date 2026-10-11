import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from "@expo-google-fonts/manrope";
import { GeistMono_400Regular, GeistMono_500Medium } from "@expo-google-fonts/geist-mono";
import { CityProvider } from "@/lib/city";
import { Ground } from "@/components/ui";

const queryClient = new QueryClient();

// The navigation container paints its own scene background (light gray by default), which would
// hide the paper gradient. Make it transparent so every screen sits on <Ground>.
const navTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "transparent", card: "transparent" },
};

// Daylight type: Manrope for text, Geist Mono for labels, Doto (round dots) for numerals.
// DotoRound is a static instance of the variable font; see assets/fonts/OFL-Doto.txt.
const FONTS = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  GeistMono_400Regular,
  GeistMono_500Medium,
  DotoRound: require("../assets/fonts/DotoRound-Bold.ttf"),
};

export default function RootLayout() {
  const [loaded, error] = useFonts(FONTS);
  // Show the ground while fonts load; if loading fails, fall back to system fonts.
  const ready = loaded || error;

  return (
    <QueryClientProvider client={queryClient}>
      <CityProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Ground>
            {ready ? (
              <ThemeProvider value={navTheme}>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="report/[id]" />
                  <Stack.Screen name="ticket/[id]" />
                </Stack>
              </ThemeProvider>
            ) : null}
          </Ground>
        </SafeAreaProvider>
      </CityProvider>
    </QueryClientProvider>
  );
}
