import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { CityProvider } from "@/lib/city";
import { ThemePrefProvider } from "@/lib/themePref";
import { useTheme, usePaperTheme } from "@/lib/theme";

const queryClient = new QueryClient();

// Paper's icon props (e.g. icon="camera") render through this component. Register it
// explicitly so the Material Community icon set is always found, per the Paper icons
// guide. The param shape mirrors Paper's internal IconProps (not re-exported).
type PaperIconProps = {
  name: string;
  color?: string;
  size?: number;
  direction?: "rtl" | "ltr";
  testID?: string;
};

const renderPaperIcon = ({ name, ...rest }: PaperIconProps) => (
  <MaterialCommunityIcons name={name as never} {...rest} />
);

// Inner tree: lives under ThemePrefProvider so useTheme()/usePaperTheme() resolve
// against the user's preference.
function ThemedApp() {
  const t = useTheme();
  const paper = usePaperTheme();
  return (
    <PaperProvider theme={paper} settings={{ icon: renderPaperIcon }}>
      <SafeAreaProvider>
        <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
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
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemePrefProvider>
        <CityProvider>
          <ThemedApp />
        </CityProvider>
      </ThemePrefProvider>
    </QueryClientProvider>
  );
}
