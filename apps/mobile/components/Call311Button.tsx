// "Call 311" button tied to the selected city. Dials the city's non-emergency line
// via the phone's dialer. Paper Button (MD3). Two variants: full (with blurb) for the
// form, and compact for the map top bar.
import { Alert, Linking, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useCity } from "@/lib/city";
import { cityContact } from "@/lib/cityInfo";

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

  if (compact) {
    return (
      <Button
        mode="contained-tonal"
        icon="phone"
        compact
        onPress={() => dial(contact.tel)}
        accessibilityLabel={contact.label}
      >
        311
      </Button>
    );
  }

  return (
    <View style={styles.wrap}>
      <Button
        mode="outlined"
        icon="phone"
        onPress={() => dial(contact.tel)}
        accessibilityLabel={contact.label}
      >
        {contact.label}
      </Button>
      <Text variant="bodySmall" style={styles.blurb}>
        {contact.blurb}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  blurb: { opacity: 0.7, lineHeight: 17 },
});
