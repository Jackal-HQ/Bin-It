import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { streetViewUrl } from "@/lib/mapHtml";
import { colors, radius, severityText } from "@/lib/theme";
import { statusText, type Status } from "@/lib/types";
import { Button, Card, DemoChip, DotNum, Led, OverlayChip, Photo, StatusPill, T, Tile, TileGrid } from "@/components/ui";
import { ScreenHeader } from "@/components/ScreenHeader";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

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
  const insets = useSafeAreaInsets();

  const severity = Number(p.severity ?? 0);
  const count = Number(p.count ?? 0);
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  const isDemo = p.demo === "1";
  const photoUrl = p.photoUrl && p.photoUrl.length > 0 ? p.photoUrl : null;
  const status = (["received", "reviewed", "resolved"].includes(p.status) ? p.status : "received") as Status;
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Ticket" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Card style={styles.card}>
          <View style={styles.titleRow}>
            <T v="heading">{p.title}</T>
            {isDemo ? <DemoChip /> : null}
          </View>

          <Photo uri={photoUrl} style={styles.photo} emptyText="No photo on this report" iconSize={48}>
            <OverlayChip style={styles.chipLeft}>
              <MaterialCommunityIcons name="vector-union" size={16} color="#FFFFFF" />
              <T v="meta" color="#FFFFFF" style={styles.chipText}>
                {count} {count === 1 ? "report" : "reports merged"}
              </T>
            </OverlayChip>
            <OverlayChip style={styles.chipRight}>
              <Led severity={severity} onDark />
              <T v="meta" color="#FFFFFF" style={styles.chipText}>
                {severityText(severity)}
              </T>
            </OverlayChip>
          </Photo>

          <TileGrid>
            <Tile label="Severity">
              <View style={styles.inline}>
                <Led severity={severity} size={10} />
                <T v="row">{severityText(severity)}</T>
                <T v="meta" color={colors.quiet}>
                  {severity} of 3
                </T>
              </View>
            </Tile>
            <Tile label="Reports here">
              <DotNum size={40}>{count}</DotNum>
            </Tile>
            <Tile label="Status">
              <View style={styles.inline}>
                <StatusPill status={status} text={statusText(status)} />
              </View>
            </Tile>
            <Tile label="Location">
              <T v="row" style={styles.mono}>
                {Number.isFinite(lat) ? lat.toFixed(5) : "?"}, {Number.isFinite(lng) ? lng.toFixed(5) : "?"}
              </T>
            </Tile>
          </TileGrid>

          {hasPoint ? <Button icon="open-in-new" label="Open in Street View" onPress={() => Linking.openURL(streetViewUrl(lat, lng))} /> : null}

          <T v="meta" color={colors.quiet} style={styles.caption}>
            Photo shown is the ticket&apos;s most severe report. A ticket can group several reports of the same overflow.
          </T>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  card: { gap: 12, padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, paddingHorizontal: 4, paddingTop: 2 },
  photo: { height: 220, borderRadius: radius.notice },
  chipLeft: { position: "absolute", left: 12, bottom: 12 },
  chipRight: { position: "absolute", right: 12, bottom: 12 },
  chipText: { fontFamily: "Manrope_600SemiBold", fontSize: 12.5 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  mono: { fontSize: 14 },
  caption: { paddingHorizontal: 4, lineHeight: 18 },
});
