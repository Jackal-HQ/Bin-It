import { Linking, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Divider, List, Text } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { streetViewUrl } from "@/lib/mapHtml";
import { useTheme } from "@/lib/theme";

// Renders from the data the Nearby screen already has (passed as params), including
// photo_url (the ticket's representative report photo from GET /api/reports/nearby).
export default function TicketDetailScreen() {
  const p = useLocalSearchParams<{
    id: string;
    title: string;
    severity: string;
    count: string;
    status: string;
    lat: string;
    lng: string;
    demo: string;
    photoUrl: string;
  }>();
  const t = useTheme();

  const severity = Number(p.severity ?? 0);
  const count = Number(p.count ?? 0);
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  const isDemo = p.demo === "1";
  const photoUrl = p.photoUrl && p.photoUrl.length > 0 ? p.photoUrl : null;
  const sevColor = severity >= 3 ? t.sev3 : severity >= 2 ? t.sev2 : t.sev1;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <Card mode="contained" style={styles.card}>
        {photoUrl ? (
          <Card.Cover source={{ uri: photoUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty, { backgroundColor: t.cardAlt }]}>
            <Text style={{ color: t.textMuted }}>No photo on this report</Text>
          </View>
        )}
        <Card.Content style={styles.content}>
          <Text variant="headlineSmall">{p.title}</Text>
          <View style={styles.chips}>
            <Chip icon="alert" style={{ backgroundColor: sevColor }} textStyle={styles.chipOn}>
              Severity {severity}
            </Chip>
            <Chip icon="map-marker">{p.status || "received"}</Chip>
            {isDemo ? (
              <Chip icon="flask" style={{ backgroundColor: t.demoBg }} textStyle={{ color: t.demoFg }}>
                Demo data
              </Chip>
            ) : null}
          </View>

          <Divider style={styles.divider} />

          <List.Item
            title="Reports here"
            right={() => <Text style={styles.value}>{count}</Text>}
          />
          <List.Item
            title="Location"
            right={() => (
              <Text style={styles.value}>
                {Number.isFinite(lat) ? lat.toFixed(5) : "?"},{" "}
                {Number.isFinite(lng) ? lng.toFixed(5) : "?"}
              </Text>
            )}
          />

          {Number.isFinite(lat) && Number.isFinite(lng) ? (
            <Button
              mode="contained"
              icon="google-street-view"
              style={styles.btn}
              onPress={() => Linking.openURL(streetViewUrl(lat, lng))}
            >
              Open in Street View
            </Button>
          ) : null}

          <Text variant="bodySmall" style={[styles.note, { color: t.textMuted }]}>
            Photo shown is the ticket&apos;s most severe report. A ticket can group several
            reports of the same overflow. Ticket {p.id}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 12 },
  card: { borderRadius: 16, overflow: "hidden" },
  cover: { height: 240 },
  coverEmpty: { alignItems: "center", justifyContent: "center" },
  content: { gap: 10, paddingVertical: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipOn: { color: "#fff" },
  divider: { marginVertical: 4 },
  value: { alignSelf: "center", fontWeight: "600" },
  btn: { marginTop: 12 },
  note: { marginTop: 12, lineHeight: 18 },
});
