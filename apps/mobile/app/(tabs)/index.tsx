import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  List,
  Text,
  TextInput,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useFocusEffect, useRouter } from "expo-router";
import { useCity } from "@/lib/city";
import { useCities, useCreateReport } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { isInCityArea } from "@/lib/geo";
import { labelText, statusText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { CitySelector } from "@/components/CitySelector";
import { Call311Button } from "@/components/Call311Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FadeInUp } from "@/components/FadeInUp";
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
  const t = useTheme();
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

  const severityColor = (s: number) => (s >= 3 ? t.sev3 : s >= 2 ? t.sev2 : t.sev1);
  // Status chip background: Pending (received) muted, Reviewed brand-ish, Resolved green.
  const statusBg = (s: MyReport["status"]) =>
    s === "resolved" ? t.bin : s === "reviewed" ? t.sev2 : t.cardAlt;

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <FadeInUp delay={0}>
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="trash-can" size={20} color={t.brand} />
            <Text variant="titleMedium">New report</Text>
          </View>

          <Text variant="labelLarge" style={styles.label}>
            City
          </Text>
          <CitySelector />

          <Text variant="labelLarge" style={styles.label}>
            Photo
          </Text>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.preview} />
          ) : (
            <View style={[styles.preview, styles.previewEmpty, { backgroundColor: t.cardAlt }]}>
              <Text style={{ color: t.textMuted }}>No photo yet</Text>
            </View>
          )}
          <View style={styles.buttonRow}>
            <Button mode="contained-tonal" icon="camera" onPress={takePhoto} style={styles.flexBtn}>
              Take photo
            </Button>
            <Button mode="contained-tonal" icon="image" onPress={pickPhoto} style={styles.flexBtn}>
              Choose
            </Button>
          </View>

          <TextInput
            label="Note (optional)"
            mode="outlined"
            value={note}
            onChangeText={setNote}
            multiline
            style={styles.input}
            placeholder="Anything staff should know?"
          />

          <Button
            mode="contained"
            icon="send"
            onPress={submit}
            loading={busy}
            disabled={busy}
            style={styles.submit}
          >
            Send report
          </Button>

          <HelperText type="info" visible style={styles.privacy}>
            No account needed. Your report is anonymous. Photos may show public areas and are
            stored at a public URL — avoid faces and license plates.
          </HelperText>
        </Card.Content>
        </Card>
      </FadeInUp>

      {myReports.length > 0 ? (
        <FadeInUp delay={80}>
          <Card mode="outlined" style={styles.card}>
            <Card.Title
              title="Your reports"
              left={(props) => <List.Icon {...props} icon="history" color={t.brand} />}
              right={() => (
                <Button
                  mode="text"
                  compact
                  icon="refresh"
                  onPress={refreshStatuses}
                  loading={refreshing}
                  disabled={refreshing || cooldown > 0}
                  style={styles.refreshBtn}
                >
                  {cooldown > 0 ? `${cooldown}s` : "Refresh"}
                </Button>
              )}
            />
            <Card.Content>
              {myReports.map((r) => (
                <List.Item
                  key={r.id}
                  title={labelText(r.label)}
                  description={`${r.city} · severity ${r.severity} · ${new Date(
                    r.created_at,
                  ).toLocaleDateString()}`}
                  onPress={() => router.push(`/report/${r.id}`)}
                  left={(props) => (
                    <List.Icon {...props} icon="circle" color={severityColor(r.severity)} />
                  )}
                  right={(props) => (
                    <View {...props} style={styles.rowRight}>
                      <Chip
                        compact
                        style={{ backgroundColor: statusBg(r.status) }}
                        textStyle={{
                          color: !r.status || r.status === "received" ? t.text : "#fff",
                          fontWeight: "700",
                          fontSize: 11,
                        }}
                      >
                        {statusText(r.status)}
                      </Chip>
                    </View>
                  )}
                />
              ))}
            </Card.Content>
          </Card>
        </FadeInUp>
      ) : null}

      <FadeInUp delay={160}>
        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title="Prefer to call?"
            left={(props) => <List.Icon {...props} icon="phone" color={t.brand} />}
          />
          <Card.Content>
            <Divider style={styles.hiddenDivider} />
            <Call311Button />
          </Card.Content>
        </Card>
      </FadeInUp>

      <FadeInUp delay={240}>
        <Card mode="outlined" style={styles.card}>
          <Card.Title
            title="Appearance"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" color={t.brand} />}
          />
          <Card.Content>
            <ThemeToggle />
          </Card.Content>
        </Card>
      </FadeInUp>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12, paddingBottom: 32 },
  card: { borderRadius: 16 },
  cardContent: { gap: 8, paddingVertical: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  refreshBtn: { marginRight: 4 },
  rowRight: { justifyContent: "center" },
  label: { marginTop: 8 },
  preview: { width: "100%", height: 220, borderRadius: 12 },
  previewEmpty: { alignItems: "center", justifyContent: "center" },
  buttonRow: { flexDirection: "row", gap: 8 },
  flexBtn: { flex: 1 },
  input: { marginTop: 4 },
  submit: { marginTop: 12 },
  privacy: { paddingHorizontal: 0 },
  hiddenDivider: { height: 0, opacity: 0 },
});
