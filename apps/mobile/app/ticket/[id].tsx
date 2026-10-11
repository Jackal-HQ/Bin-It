import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { streetViewUrl } from "@/lib/mapHtml";
import { useTheme, type Palette } from "@/lib/theme";

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
  const styles = useMemo(() => makeStyles(t), [t]);

  const severity = Number(p.severity ?? 0);
  const count = Number(p.count ?? 0);
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  const isDemo = p.demo === "1";
  const photoUrl = p.photoUrl && p.photoUrl.length > 0 ? p.photoUrl : null;

  const sevColor = severity >= 3 ? t.sev3 : severity >= 2 ? t.sev2 : t.sev1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Text style={styles.hint}>No photo on this report</Text>
        </View>
      )}

      <View style={[styles.banner, { backgroundColor: sevColor }]}>
        <Text style={styles.bannerText}>{p.title}</Text>
        <Text style={styles.bannerSub}>Severity {severity} / 3</Text>
      </View>

      {isDemo ? (
        <View style={styles.demoBadge}>
          <Text style={styles.demoText}>DEMO DATA</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <Text style={styles.label}>Reports here</Text>
        <Text style={styles.value}>{count}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{p.status || "received"}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>
          {Number.isFinite(lat) ? lat.toFixed(5) : "?"},{" "}
          {Number.isFinite(lng) ? lng.toFixed(5) : "?"}
        </Text>
      </View>

      {Number.isFinite(lat) && Number.isFinite(lng) ? (
        <Pressable style={styles.btn} onPress={() => Linking.openURL(streetViewUrl(lat, lng))}>
          <Text style={styles.btnText}>Open in Street View</Text>
        </Pressable>
      ) : null}

      <Text style={styles.ticketRef}>Ticket {p.id}</Text>
      <Text style={styles.note}>
        Photo shown is the ticket&apos;s most severe report. A ticket can group several
        reports of the same overflow.
      </Text>
    </ScrollView>
  );
}

function makeStyles(t: Palette) {
  return StyleSheet.create({
    container: { padding: 16, gap: 4, backgroundColor: t.bg, flexGrow: 1 },
    photo: { width: "100%", height: 240, borderRadius: 14, backgroundColor: t.cardAlt },
    photoEmpty: { alignItems: "center", justifyContent: "center" },
    hint: { color: t.textMuted },
    banner: { borderRadius: 14, padding: 20, marginTop: 12, marginBottom: 8 },
    bannerText: { color: "#fff", fontSize: 22, fontWeight: "800" },
    bannerSub: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600", marginTop: 4 },
    demoBadge: {
      alignSelf: "flex-start",
      backgroundColor: t.demoBg,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 4,
    },
    demoText: { color: t.demoFg, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
    },
    label: { color: t.textMuted, fontSize: 14 },
    value: { color: t.text, fontSize: 14, fontWeight: "600" },
    btn: {
      backgroundColor: t.brand,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 16,
    },
    btnText: { color: t.brandFg, fontWeight: "700", fontSize: 15 },
    ticketRef: { marginTop: 20, color: t.textMuted, fontSize: 12 },
    note: { marginTop: 6, color: t.textMuted, fontSize: 12, lineHeight: 18 },
  });
}
