// Appearance toggle: System / Light / Dark. Writes to the persisted theme preference,
// which useTheme()/usePaperTheme() resolve against app-wide.
import { StyleSheet } from "react-native";
import { SegmentedButtons } from "react-native-paper";
import { useThemePref, type ThemePref } from "@/lib/themePref";

export function ThemeToggle() {
  const { pref, setPref } = useThemePref();
  return (
    <SegmentedButtons
      value={pref}
      onValueChange={(v) => setPref(v as ThemePref)}
      buttons={[
        { value: "system", label: "System", icon: "cellphone" },
        { value: "light", label: "Light", icon: "white-balance-sunny" },
        { value: "dark", label: "Dark", icon: "weather-night" },
      ]}
      style={styles.seg}
    />
  );
}

const styles = StyleSheet.create({
  seg: { marginTop: 4 },
});
