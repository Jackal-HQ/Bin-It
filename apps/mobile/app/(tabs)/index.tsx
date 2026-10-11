import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  HelperText,
  List,
  Text,
  TextInput,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useFocusEffect, useRouter } from "expo-router";
import { useCity } from "@/lib/city";
import { useCities, useCreateReport } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { isInCityArea } from "@/lib/geo";
import { labelText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { CitySelector } from "@/components/CitySelector";
import { Call311Button } from "@/components/Call311Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { addMyReport, getMyReports, type MyReport } from "@/lib/myReports";

const MAX_EDGE = 1600; // contract: JPEG, longest side <= 1600 px

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyReports().then((r) => active && setMyReports(r));
      return () => {
        active = false;
      };
    }, []),
  );

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

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Card mode="contained" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">New report</Text>

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

      {myReports.length > 0 ? (
        <Card mode="contained" style={styles.card}>
          <Card.Title title="Your reports" />
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
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
              />
            ))}
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="contained" style={styles.card}>
        <Card.Title title="Prefer to call?" />
        <Card.Content>
          <Divider style={styles.hiddenDivider} />
          <Call311Button />
        </Card.Content>
      </Card>

      <Card mode="contained" style={styles.card}>
        <Card.Title title="Appearance" />
        <Card.Content>
          <ThemeToggle />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12, paddingBottom: 32 },
  card: { borderRadius: 16 },
  cardContent: { gap: 8, paddingVertical: 8 },
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
