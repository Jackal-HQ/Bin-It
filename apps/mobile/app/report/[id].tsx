import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useReport } from "@/lib/hooks";
import { labelText, statusText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";
import { colors, radius, severityText } from "@/lib/theme";
import { Card, DemoChip, Led, OverlayChip, Photo, StatusPill, T, Tile, TileGrid } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, isLoading, error } = useReport(id);
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Report" />
        <View style={styles.center}>
          <ActivityIndicator color={colors.charcoal} />
        </View>
      </View>
    );
  }

  if (error || !report) {
    const msg = error instanceof ApiRequestError ? error.message : "Could not load this report.";
    return (
      <View style={styles.flex}>
        <ScreenHeader title="Report" />
        <View style={styles.center}>
          <T v="body" color={colors.coralInk} style={styles.centerText}>
            {msg}
          </T>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Report" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Card style={styles.card}>
          <View style={styles.titleRow}>
            <T v="heading">{labelText(report.label)}</T>
            {report.is_synthetic ? <DemoChip /> : null}
          </View>

          <Photo uri={report.photo_url} style={styles.photo} emptyText="No photo" iconSize={48}>
            <OverlayChip style={styles.chipRight}>
              <Led severity={report.severity} onDark />
              <T v="meta" color="#FFFFFF" style={styles.chipText}>
                {severityText(report.severity)}
              </T>
            </OverlayChip>
          </Photo>

          <TileGrid>
            <Tile label="Severity">
              <View style={styles.inline}>
                <Led severity={report.severity} size={10} />
                <T v="row">{severityText(report.severity)}</T>
                <T v="meta" color={colors.quiet}>
                  {report.severity} of 3
                </T>
              </View>
            </Tile>
            <Tile label="City">
              <View style={styles.inline}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.soft} />
                <T v="row">{report.city}</T>
              </View>
            </Tile>
            {report.status ? (
              <Tile label="Status">
                <StatusPill status={report.status} text={statusText(report.status)} />
              </Tile>
            ) : null}
            <Tile label="Location">
              <T v="row" style={styles.mono}>
                {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
              </T>
            </Tile>
            <Tile label="Reported" style={styles.wide}>
              <T v="row">{new Date(report.created_at).toLocaleString()}</T>
            </Tile>
            {report.note ? (
              <Tile label="Note" style={styles.wide}>
                <T v="body">{report.note}</T>
              </Tile>
            ) : null}
          </TileGrid>

          <T v="meta" color={colors.quiet} style={styles.caption}>
            Ticket {report.ticket_id}
          </T>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  centerText: { textAlign: "center" },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  card: { gap: 12, padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, paddingHorizontal: 4, paddingTop: 2 },
  photo: { height: 240, borderRadius: radius.notice },
  chipRight: { position: "absolute", right: 12, bottom: 12 },
  chipText: { fontFamily: "Manrope_600SemiBold", fontSize: 12.5 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  mono: { fontSize: 14 },
  wide: { flexBasis: "100%" },
  caption: { paddingHorizontal: 4 },
});
