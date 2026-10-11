import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Card, Chip, Divider, List, Text } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { useReport } from "@/lib/hooks";
import { labelText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, isLoading, error } = useReport(id);
  const t = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !report) {
    const msg =
      error instanceof ApiRequestError ? error.message : "Could not load this report.";
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <Text style={{ color: t.danger }}>{msg}</Text>
      </View>
    );
  }

  const sevColor =
    report.severity >= 3 ? t.sev3 : report.severity >= 2 ? t.sev2 : t.sev1;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <Card mode="contained" style={styles.card}>
        {report.photo_url ? (
          <Card.Cover source={{ uri: report.photo_url }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverEmpty, { backgroundColor: t.cardAlt }]}>
            <Text style={{ color: t.textMuted }}>No photo</Text>
          </View>
        )}
        <Card.Content style={styles.content}>
          <Text variant="headlineSmall">{labelText(report.label)}</Text>
          <View style={styles.chips}>
            <Chip icon="alert" style={{ backgroundColor: sevColor }} textStyle={styles.chipOn}>
              Severity {report.severity}
            </Chip>
            <Chip icon="city">{report.city}</Chip>
            {report.is_synthetic ? (
              <Chip icon="flask" style={{ backgroundColor: t.demoBg }} textStyle={{ color: t.demoFg }}>
                Demo data
              </Chip>
            ) : null}
          </View>

          <Divider style={styles.divider} />

          <List.Item
            title="Location"
            right={() => (
              <Text style={styles.value}>
                {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
              </Text>
            )}
          />
          <List.Item
            title="Reported"
            right={() => (
              <Text style={styles.value}>{new Date(report.created_at).toLocaleString()}</Text>
            )}
          />
          {report.note ? (
            <List.Item title="Note" description={report.note} descriptionNumberOfLines={0} />
          ) : null}

          <Text variant="bodySmall" style={[styles.note, { color: t.textMuted }]}>
            Ticket {report.ticket_id}
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { borderRadius: 16, overflow: "hidden" },
  cover: { height: 260 },
  coverEmpty: { alignItems: "center", justifyContent: "center" },
  content: { gap: 10, paddingVertical: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipOn: { color: "#fff" },
  divider: { marginVertical: 4 },
  value: { alignSelf: "center", fontWeight: "600" },
  note: { marginTop: 12 },
});
