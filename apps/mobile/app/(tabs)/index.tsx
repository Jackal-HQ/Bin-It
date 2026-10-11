import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCity } from "@/lib/city";
import { useCities, useCreateReport } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { isInCityArea } from "@/lib/geo";
import { labelText, statusText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";
import { colors, font, radius } from "@/lib/theme";
import { CitySelector } from "@/components/CitySelector";
import { Call311Button } from "@/components/Call311Button";
import { FadeInUp } from "@/components/FadeInUp";
import { TAB_BAR_SPACE } from "@/components/TabBar";
import { Brand, Button, Card, Led, Notice, Photo, StatusPill, T } from "@/components/ui";
import {
  addMyReport,
  getMyReports,
  refreshMyReportStatuses,
  type MyReport,
} from "@/lib/myReports";

const MAX_EDGE = 1600; // contract: JPEG, longest side <= 1600 px
const REFRESH_COOLDOWN_MS = 60_000; // status refresh limited to once per minute

export default function ReportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { city } = useCity();
  const { data: cities } = useCities();
  const createReport = useCreateReport();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [myReports, setMyReports] = useState<MyReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Seconds left on the once-per-minute cooldown (0 = refresh allowed).
  const [cooldown, setCooldown] = useState(0);
  const lastRefreshRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyReports().then((r) => active && setMyReports(r));
      return () => {
        active = false;
      };
    }, []),
  );

  // Tick the cooldown down to zero once a refresh has happened.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      const left = Math.ceil((REFRESH_COOLDOWN_MS - (Date.now() - lastRefreshRef.current)) / 1000);
      setCooldown(left > 0 ? left : 0);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function refreshStatuses() {
    const since = Date.now() - lastRefreshRef.current;
    if (refreshing || since < REFRESH_COOLDOWN_MS) return; // throttled: once per minute
    setRefreshing(true);
    try {
      const updated = await refreshMyReportStatuses();
      setMyReports(updated);
      lastRefreshRef.current = Date.now();
      setCooldown(Math.ceil(REFRESH_COOLDOWN_MS / 1000));
    } catch {
      // leave last-known statuses in place
    } finally {
      setRefreshing(false);
    }
  }

  async function processImage(uri: string): Promise<string> {
    const ctx = ImageManipulator.manipulate(uri).resize({ width: MAX_EDGE });
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
    return result.uri;
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera needed", "Allow camera access to photograph the bin.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!res.canceled) setPhotoUri(await processImage(res.assets[0].uri));
  }

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!res.canceled) setPhotoUri(await processImage(res.assets[0].uri));
  }

  async function submit() {
    if (!photoUri) {
      Alert.alert("Add a photo", "A photo of the overflowing bin is required.");
      return;
    }
    setBusy(true);
    try {
      const coords = await getCurrentCoords();

      // Only accept reports from inside the selected city's area. Reports are tied to
      // their GPS location, so an out-of-area report would land nowhere useful.
      const cityObj = cities?.find((c) => c.slug === city);
      if (!isInCityArea(coords, cityObj)) {
        Alert.alert(
          "You're outside the city",
          `Your location isn't within ${cityObj?.name ?? "the selected city"}. ` +
            "Move into the city, or switch the city picker to where you are, then try again.",
        );
        return;
      }

      const out = await createReport.mutateAsync({
        city,
        lat: coords.lat,
        lng: coords.lng,
        note: note.trim() || undefined,
        photoUri,
      });
      setPhotoUri(null);
      setNote("");
      const saved = await addMyReport({
        id: out.report.id,
        city: out.report.city,
        label: out.report.label,
        severity: out.report.severity,
        created_at: out.report.created_at,
        status: out.ticket.status,
      });
      setMyReports(saved);
      const merged = out.ticket.merged ? " (merged with a nearby report)" : "";
      Alert.alert(
        "Report sent",
        `Classified as ${labelText(out.report.label)}, severity ${out.report.severity}.${merged}`,
        [{ text: "View", onPress: () => router.push(`/report/${out.report.id}`) }, { text: "OK" }],
      );
    } catch (e) {
      const msg = e instanceof ApiRequestError ? e.message : String(e);
      Alert.alert("Could not send report", msg);
    } finally {
      setBusy(false);
    }
  }

  const cityName = (slug: string) => cities?.find((c) => c.slug === slug)?.name.split(",")[0] ?? slug;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + TAB_BAR_SPACE }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Brand />
      </View>

      <FadeInUp delay={0}>
        <Card style={styles.cardGap}>
          <View>
            <T v="eyebrow">New report</T>
            <T v="heading" style={styles.cardTitle}>
              Photograph the overflow
            </T>
          </View>

          <View style={styles.field}>
            <T v="eyebrow">City</T>
            <CitySelector fill />
          </View>

          <View style={styles.field}>
            <T v="eyebrow">Photo</T>
            <Photo uri={photoUri} style={styles.preview} emptyText="No photo yet" />
            <View style={styles.buttonRow}>
              <Button icon="camera-outline" label="Take photo" onPress={takePhoto} style={styles.flexBtn} />
              <Button icon="image-outline" label="Choose" onPress={pickPhoto} style={styles.flexBtn} />
            </View>
          </View>

          <View style={styles.field}>
            <T v="eyebrow">Note (optional)</T>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Anything staff should know?"
              placeholderTextColor={colors.quiet}
              style={styles.input}
            />
          </View>

          <Button kind="primary" icon="send" label="Send report" onPress={submit} loading={busy} disabled={!photoUri} />

          <Notice>
            <T v="meta" color="#3E3B33" style={styles.noticeText}>
              No account needed. Your report is anonymous. Photos may show public areas and are stored at a public URL: avoid
              faces and license plates.
            </T>
          </Notice>
        </Card>
      </FadeInUp>

      {myReports.length > 0 ? (
        <FadeInUp delay={80}>
          <Card style={styles.listCard}>
            <View style={styles.listHeader}>
              <View>
                <T v="eyebrow">History</T>
                <T v="heading" style={styles.cardTitle}>
                  Your reports
                </T>
              </View>
              <Button
                kind="ghost"
                compact
                icon="refresh"
                label={cooldown > 0 ? `${cooldown}s` : "Refresh"}
                onPress={refreshStatuses}
                loading={refreshing}
                disabled={refreshing || cooldown > 0}
              />
            </View>
            {myReports.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => router.push(`/report/${r.id}`)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.well }]}
              >
                <View style={styles.rowMain}>
                  <T v="row">{labelText(r.label)}</T>
                  <View style={styles.rowMeta}>
                    <Led severity={r.severity} />
                    <T v="meta">
                      {cityName(r.city)} · severity {r.severity} · {new Date(r.created_at).toLocaleDateString()}
                    </T>
                  </View>
                </View>
                <StatusPill status={r.status} text={statusText(r.status)} />
              </Pressable>
            ))}
          </Card>
        </FadeInUp>
      ) : null}

      <FadeInUp delay={160}>
        <Card style={styles.cardGap}>
          <View>
            <T v="eyebrow">Prefer to call?</T>
            <T v="heading" style={styles.cardTitle}>
              Reach city services
            </T>
          </View>
          <Call311Button />
        </Card>
      </FadeInUp>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { paddingHorizontal: 16, gap: 12 },
  header: { height: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  cardGap: { gap: 16, padding: 18 },
  cardTitle: { marginTop: 4 },
  field: { gap: 8 },
  preview: { width: "100%", height: 220, borderRadius: radius.tile },
  buttonRow: { flexDirection: "row", gap: 8 },
  flexBtn: { flex: 1 },
  input: {
    minHeight: 84,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: colors.rim,
    backgroundColor: "#FFFFFF",
    fontFamily: font.ui500,
    fontSize: 15,
    color: colors.strong,
    textAlignVertical: "top",
  },
  noticeText: { lineHeight: 19 },
  listCard: { padding: 10 },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.row },
  rowMain: { flex: 1, gap: 6 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
});
