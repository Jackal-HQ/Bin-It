// Header for pushed screens (ticket and report detail): a round back button and the screen
// name, drawn on the ground instead of a native header bar.
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, T } from "@/components/ui";

export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <IconButton icon="arrow-left" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
      <T v="eyebrow">{title}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
});
