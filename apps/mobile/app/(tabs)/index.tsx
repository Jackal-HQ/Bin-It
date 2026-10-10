import { useState } from "react";
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
import { useRouter } from "expo-router";
import { useCity } from "@/lib/city";
import { useCities, useCreateReport } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { labelText } from "@/lib/types";
import { ApiRequestError } from "@/lib/api";

const MAX_EDGE = 1600; // contract: JPEG, longest side <= 1600 px

export default function ReportScreen() {
  const router = useRouter();
  const { city, setCity } = useCity();
  const { data: cities } = useCities();
  const createReport = useCreateReport();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

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
      <View style={styles.cityRow}>
        {(cities ?? []).map((c) => (
          <Pressable
            key={c.slug}
            onPress={() => setCity(c.slug)}
            style={[styles.chip, city === c.slug && styles.chipActive]}
          >
            <Text style={[styles.chipText, city === c.slug && styles.chipTextActive]}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 8 },
  cityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  chipActive: { backgroundColor: "#166534" },
  chipText: { color: "#374151", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  preview: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#f3f4f6" },
  previewEmpty: { alignItems: "center", justifyContent: "center" },
  previewHint: { color: "#9ca3af" },
  buttonRow: { flexDirection: "row", gap: 8 },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  btnSecondary: { flex: 1, backgroundColor: "#e5e7eb" },
  btnSecondaryText: { color: "#166534", fontWeight: "600" },
  btnPrimary: { backgroundColor: "#166534", marginTop: 12 },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    textAlignVertical: "top",
  },
  privacy: { fontSize: 12, color: "#6b7280", marginTop: 16, lineHeight: 18 },
});
