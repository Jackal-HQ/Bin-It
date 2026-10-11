// "Call 311" button tied to the selected city. Dials the city's non-emergency line
// via the phone's dialer. Two variants: full (with blurb) for the form, and compact
// (icon + short label) for the map top bar.
import { useMemo } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useCity } from "@/lib/city";
import { cityContact } from "@/lib/cityInfo";
import { useTheme, type Palette } from "@/lib/theme";

async function dial(tel: string) {
  const url = `tel:${tel.replace(/[^0-9+]/g, "")}`;
  const ok = await Linking.canOpenURL(url);
  if (ok) {
    Linking.openURL(url);
  } else {
    Alert.alert("Can't place call", `Dial ${tel} from your phone.`);
  }
}

export function Call311Button({ compact = false }: { compact?: boolean }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { city } = useCity();
  const contact = cityContact(city);

  if (compact) {
    return (
      <Pressable
        style={styles.compact}
        onPress={() => dial(contact.tel)}
        accessibilityRole="button"
        accessibilityLabel={contact.label}
      >
        <Text style={styles.compactIcon}>📞</Text>
        <Text style={styles.compactText}>311</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.btn}
        onPress={() => dial(contact.tel)}
        accessibilityRole="button"
        accessibilityLabel={contact.label}
      >
        <Text style={styles.icon}>📞</Text>
        <Text style={styles.btnText}>{contact.label}</Text>
      </Pressable>
      <Text style={styles.blurb}>{contact.blurb}</Text>
    </View>
  );
}

function makeStyles(t: Palette) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 10,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: t.brand,
      backgroundColor: "transparent",
    },
    icon: { fontSize: 16 },
    btnText: { color: t.brand, fontWeight: "700", fontSize: 15 },
    blurb: { color: t.textMuted, fontSize: 12, lineHeight: 17 },
    compact: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: t.mode === "dark" ? "rgba(20,20,20,.95)" : "rgba(255,255,255,.95)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: t.brand,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    compactIcon: { fontSize: 14 },
    compactText: { color: t.brand, fontWeight: "700", fontSize: 13 },
  });
}
