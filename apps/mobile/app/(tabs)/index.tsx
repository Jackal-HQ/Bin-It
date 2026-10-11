import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useFocusEffect, useRouter } from "expo-router";
import { useCity } from "@/lib/city";
import { useCreateReport } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { labelText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";
import { useTheme, type Palette } from "@/lib/theme";
import { CitySelector } from "@/components/CitySelector";
import { Call311Button } from "@/components/Call311Button";
import { addMyReport, getMyReports, type MyReport } from "@/lib/myReports";

const MAX_EDGE = 1600; // contract: JPEG, longest side <= 1600 px

export default function ReportScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { city } = useCity();
  const createReport = useCreateReport();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [myReports, setMyReports] = useState<MyReport[]>([]);

  // Refresh the local history whenever this tab regains focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyReports().then((r) => active && setMyReports(r));
      return () => {
        active = false;
      };
    }, []),
  );

  // Resize/compress to a <=1600px JPEG so uploads are small and match the contract.
  async function processImage(uri: string): Promise<string> {
    const ctx = ImageManipulator.manipulate(uri).resize({ width: MAX_EDGE });
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({
      compress: 0.7,
      format: SaveFormat.JPEG,
    });
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
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
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
      const out = await createReport.mutateAsync({
        city,
        lat: coords.lat,
        lng: coords.lng,
        note: note.trim() || undefined,
        photoUri,
      });
      setPhotoUri(null);
      setNote("");
      // keep a local record so the resident can find it again (no accounts/API for this)
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>City</Text>
      <CitySelector />

      <Text style={styles.label}>Photo</Text>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <View style={[styles.preview, styles.previewEmpty]}>
          <Text style={styles.previewHint}>No photo yet</Text>
        </View>
      )}
      <View style={styles.buttonRow}>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={takePhoto}>
          <Text style={styles.btnSecondaryText}>Take photo</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={pickPhoto}>
          <Text style={styles.btnSecondaryText}>Choose photo</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Note (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Anything staff should know?"
        placeholderTextColor={t.textMuted}
        value={note}
        onChangeText={setNote}
        multiline
      />

      <Pressable
        style={[styles.btn, styles.btnPrimary, busy && styles.btnDisabled]}
        onPress={submit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnPrimaryText}>Send report</Text>
        )}
      </Pressable>

      <Text style={styles.privacy}>
        No account needed. Your report is anonymous. Photos may show public areas and
        are stored at a public URL — avoid faces and license plates.
      </Text>

      {myReports.length > 0 ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.label}>Your reports</Text>
          {myReports.map((r) => (
            <Pressable
              key={r.id}
              style={styles.historyRow}
              onPress={() => router.push(`/report/${r.id}`)}
            >
              <View
                style={[
                  styles.historyDot,
                  {
                    backgroundColor:
                      r.severity >= 3 ? t.sev3 : r.severity >= 2 ? t.sev2 : t.sev1,
                  },
                ]}
              />
              <View style={styles.historyBody}>
                <Text style={styles.historyTitle}>{labelText(r.label)}</Text>
                <Text style={styles.historySub}>
                  {r.city} · severity {r.severity} ·{" "}
                  {new Date(r.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.historyChevron}>›</Text>
            </Pressable>
          ))}
        </>
      ) : null}

      <View style={styles.divider} />
      <Text style={styles.label}>Prefer to call?</Text>
      <Call311Button />
    </ScrollView>
  );
}

function makeStyles(t: Palette) {
  return StyleSheet.create({
    container: { padding: 16, gap: 8, backgroundColor: t.bg, flexGrow: 1 },
    label: { fontSize: 14, fontWeight: "600", color: t.text, marginTop: 8 },
    preview: { width: "100%", height: 220, borderRadius: 12, backgroundColor: t.cardAlt },
    previewEmpty: { alignItems: "center", justifyContent: "center" },
    previewHint: { color: t.textMuted },
    buttonRow: { flexDirection: "row", gap: 8 },
    btn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
    btnSecondary: { flex: 1, backgroundColor: t.cardAlt },
    btnSecondaryText: { color: t.brand, fontWeight: "600" },
    btnPrimary: { backgroundColor: t.brand, marginTop: 12 },
    btnPrimaryText: { color: t.brandFg, fontWeight: "700", fontSize: 16 },
    btnDisabled: { opacity: 0.6 },
    input: {
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      padding: 12,
      minHeight: 60,
      textAlignVertical: "top",
      color: t.text,
      backgroundColor: t.card,
    },
    privacy: { fontSize: 12, color: t.textMuted, marginTop: 16, lineHeight: 18 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 16 },
    historyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
    },
    historyDot: { width: 12, height: 12, borderRadius: 6 },
    historyBody: { flex: 1 },
    historyTitle: { fontSize: 15, fontWeight: "600", color: t.text },
    historySub: { fontSize: 12, color: t.textMuted, marginTop: 2 },
    historyChevron: { color: t.brand, fontSize: 20, fontWeight: "700" },
  });
}
