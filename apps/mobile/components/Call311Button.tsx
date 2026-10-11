// "Call 311" button tied to the selected city. Dials the city's non-emergency line via the
// phone's dialer. Two variants: full (with blurb) for the form, and compact for the map top bar.
import { Alert, Linking, StyleSheet, useWindowDimensions, View } from "react-native";
import { useCity } from "@/lib/city";
import { cityContact } from "@/lib/cityInfo";
import { colors } from "@/lib/theme";
import { Button, IconButton, T } from "@/components/ui";

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
  const { city } = useCity();
  const contact = cityContact(city);
  const { width } = useWindowDimensions();

  if (compact) {
    // On very narrow phones the map's top bar has no room for a labelled button.
    if (width < 360) {
      return <IconButton icon="phone-outline" accessibilityLabel={contact.label} onPress={() => dial(contact.tel)} style={styles.round} />;
    }
    return <Button compact icon="phone-outline" label="311" accessibilityLabel={contact.label} onPress={() => dial(contact.tel)} style={styles.compact} />;
  }

  return (
    <View style={styles.wrap}>
      <Button icon="phone-outline" label={contact.label} onPress={() => dial(contact.tel)} />
      <T v="meta">{contact.blurb}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  compact: { paddingHorizontal: 16 },
  round: { backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: colors.rim },
});
