import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useReport } from "@/lib/hooks";
import { labelText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";
import { useTheme, type Palette } from "@/lib/theme";

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, isLoading, error } = useReport(id);
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} />
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

function makeStyles(t: Palette) {
  return StyleSheet.create({
    container: { padding: 16, gap: 4, backgroundColor: t.bg, flexGrow: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: t.bg },
    err: { color: t.danger, textAlign: "center" },
    photo: { width: "100%", height: 260, borderRadius: 12, backgroundColor: t.cardAlt },
    photoEmpty: { alignItems: "center", justifyContent: "center" },
    hint: { color: t.textMuted },
    demoBadge: {
      alignSelf: "flex-start",
      backgroundColor: t.demoBg,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
      marginTop: 8,
    },
    demoText: { color: t.demoFg, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    label: { color: t.textMuted, fontSize: 14 },
    value: { color: t.text, fontSize: 14, fontWeight: "600" },
    noteBox: { marginTop: 12, gap: 4 },
    note: { color: t.text, fontSize: 14, lineHeight: 20 },
    ticketRef: { marginTop: 20, color: t.textMuted, fontSize: 12 },
  });
}
