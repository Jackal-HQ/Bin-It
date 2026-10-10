import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useReport } from "@/lib/hooks";
import { labelText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, isLoading, error } = useReport(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !report) {
    const msg =
      error instanceof ApiRequestError ? error.message : "Could not load this report.";
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{msg}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {report.photo_url ? (
        <Image source={{ uri: report.photo_url }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Text style={styles.hint}>No photo</Text>
        </View>
      )}

      {report.is_synthetic ? (
        <View style={styles.demoBadge}>
          <Text style={styles.demoText}>DEMO DATA</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Classification</Text>
        <Text style={styles.value}>{labelText(report.label)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Severity</Text>
        <Text style={styles.value}>{report.severity} / 3</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>City</Text>
        <Text style={styles.value}>{report.city}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>
          {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Reported</Text>
        <Text style={styles.value}>{new Date(report.created_at).toLocaleString()}</Text>
      </View>
      {report.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.label}>Note</Text>
          <Text style={styles.note}>{report.note}</Text>
        </View>
      ) : null}

      <Text style={styles.ticketRef}>Ticket {report.ticket_id}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  err: { color: "#b91c1c", textAlign: "center" },
  photo: { width: "100%", height: 260, borderRadius: 12, backgroundColor: "#f3f4f6" },
  photoEmpty: { alignItems: "center", justifyContent: "center" },
  hint: { color: "#9ca3af" },
  demoBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fde68a",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  demoText: { color: "#92400e", fontWeight: "700", fontSize: 11, letterSpacing: 0.5 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  label: { color: "#6b7280", fontSize: 14 },
  value: { color: "#111827", fontSize: 14, fontWeight: "600" },
  noteBox: { marginTop: 12, gap: 4 },
  note: { color: "#111827", fontSize: 14, lineHeight: 20 },
  ticketRef: { marginTop: 20, color: "#9ca3af", fontSize: 12 },
});
