import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCity } from "@/lib/city";
import { useCities, useNearby } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { mapHtml, streetViewUrl, type MapMessage, type MapPoint } from "@/lib/mapHtml";
import { labelText } from "@/lib/types";
import { useTheme, type Palette } from "@/lib/theme";
import { CitySelector } from "@/components/CitySelector";
import { Call311Button } from "@/components/Call311Button";

const NEAR_CITY_KM = 60;

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export default function NearbyScreen() {
  const router = useRouter();
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const { city } = useCity();
  const { data: cities } = useCities();
  const webRef = useRef<WebView>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const cityInfo = cities?.find((c) => c.slug === city);
  const cityCenter = cityInfo?.center ?? null;

  useEffect(() => {
    let active = true;
    getCurrentCoords()
      .then((c) => {
        if (!active) return;
        // The city bbox in data/cities is rough (UCF falls outside Orlando's), so judge
        // "in the city" by distance from the center instead.
        const nearCity = !cityCenter || distanceKm(c, cityCenter) <= NEAR_CITY_KM;
        setCoords(nearCity ? c : cityCenter);
      })
      .catch((e) => {
        if (active) {
          setLocationError(String(e?.message ?? e));
          if (cityCenter) setCoords(cityCenter);
        }
      });
    return () => {
      active = false;
    };
  }, [cityCenter?.lat, cityCenter?.lng, city]);

  // Ask for the whole city plus a margin around the phone, not a small circle: the demo data
  // lives in clusters across the city, and the phone may be outside the (rough) city bbox.
  const cityBbox = cityInfo?.bbox;
  const bbox = useMemo<[number, number, number, number] | null>(() => {
    if (!cityBbox || !coords) return null;
    const pad = 0.05; // about 5 km
    return [
      Math.min(cityBbox[0], coords.lng - pad),
      Math.min(cityBbox[1], coords.lat - pad),
      Math.max(cityBbox[2], coords.lng + pad),
      Math.max(cityBbox[3], coords.lat + pad),
    ];
  }, [cityBbox?.join(","), coords?.lat, coords?.lng]);

  const { data, isLoading, error, refetch, isRefetching } = useNearby({
    city,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    radiusM: 2000,
    bbox,
  });

  // One ordered list of points; its indices match the markers created in mapHtml,
  // so a list row can focus the matching marker via focusPoint(i).
  const points: MapPoint[] = useMemo(
    () => [
      ...(data?.tickets ?? []).map((t2) => ({
        kind: "ticket" as const,
        id: t2.id,
        lat: t2.lat,
        lng: t2.lng,
        title: labelText(t2.label),
        severity: t2.max_severity,
        count: t2.report_count,
        status: t2.status,
        demo: t2.is_synthetic,
        detail: `${t2.report_count} report${t2.report_count === 1 ? "" : "s"} at this spot`,
        photoUrl: t2.photo_url ?? null,
      })),
      ...(data?.bins ?? []).map((b) => ({
        kind: "bin" as const,
        id: b.id,
        lat: b.lat,
        lng: b.lng,
        title: "Trash bin",
        severity: 0,
        count: 0,
        status: b.source,
        demo: false,
        detail: `Source: ${b.source}`,
      })),
    ],
    [data],
  );

  function openDetail(p: MapPoint) {
    if (p.kind !== "ticket") return;
    // Nearby returns ticket ids (not report ids), so pass the data we already
    // have as params; the detail screen renders without another request.
    router.push({
      pathname: "/ticket/[id]",
      params: {
        id: p.id,
        title: p.title,
        severity: String(p.severity),
        count: String(p.count),
        status: p.status,
        lat: String(p.lat),
        lng: String(p.lng),
        demo: p.demo ? "1" : "0",
        photoUrl: p.photoUrl ?? "",
      },
    });
  }

  function focusOnMap(index: number) {
    setListOpen(false);
    webRef.current?.injectJavaScript(`window.focusPoint(${index}); true;`);
  }

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as MapMessage;
      if (msg.type === "streetview") {
        Linking.openURL(streetViewUrl(msg.lat, msg.lng));
      } else if (msg.type === "view") {
        const p = points.find((pt) => pt.id === msg.id && pt.kind === "ticket");
        if (p) openDetail(p);
      }
    } catch {
      // ignore messages we did not send
    }
  };

  if (!coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={t.brand} />
        <Text style={styles.hint}>Finding your location…</Text>
        {locationError ? <Text style={styles.err}>{locationError}</Text> : null}
      </View>
    );
  }

  const ticketCount = data?.tickets.length ?? 0;
  const binCount = data?.bins.length ?? 0;

  return (
    <View style={styles.flex}>
      <WebView
        ref={webRef}
        style={styles.flex}
        originWhitelist={["*"]}
        source={{ html: mapHtml(coords, points, t.mode === "dark") }}
        onMessage={onMessage}
        javaScriptEnabled
      />

      {/* top bar: city picker (shared) + per-city 311 call, over the map */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={styles.topBarSelector}>
          <CitySelector compact />
        </View>
        <Call311Button compact />
      </View>

      {isLoading ? (
        <View style={styles.badge}>
          <ActivityIndicator size="small" color={t.brand} />
          <Text style={styles.badgeText}>Loading nearby…</Text>
        </View>
      ) : error ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Could not load nearby reports.</Text>
        </View>
      ) : (
        <Pressable
          style={styles.badge}
          onPress={() => setListOpen(true)}
          disabled={ticketCount + binCount === 0}
        >
          {isRefetching ? <ActivityIndicator size="small" color={t.brand} /> : null}
          <Text style={styles.badgeText}>
            {ticketCount} report{ticketCount === 1 ? "" : "s"} · {binCount} bin
            {binCount === 1 ? "" : "s"}
          </Text>
          {ticketCount + binCount > 0 ? <Text style={styles.badgeChevron}>›</Text> : null}
        </Pressable>
      )}

      <Modal
        visible={listOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setListOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setListOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Nearby</Text>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => refetch()} hitSlop={10} disabled={isRefetching}>
                <Text style={styles.sheetRefresh}>
                  {isRefetching ? "Refreshing…" : "Refresh"}
                </Text>
              </Pressable>
              <Pressable onPress={() => setListOpen(false)} hitSlop={10}>
                <Text style={styles.sheetClose}>Close</Text>
              </Pressable>
            </View>
          </View>
          <FlatList
            data={points}
            keyExtractor={(p) => `${p.kind}_${p.id}`}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={t.brand}
                colors={[t.brand]}
              />
            }
            renderItem={({ item, index }) => (
              <Pressable style={styles.row} onPress={() => focusOnMap(index)}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: dotColor(item, t) },
                    item.kind === "bin" && styles.dotBin,
                  ]}
                >
                  {item.kind === "ticket" ? (
                    <Text style={styles.dotText}>{item.count}</Text>
                  ) : null}
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>
                    {item.title}
                    {item.demo ? "  · demo" : ""}
                  </Text>
                  <Text style={styles.rowDetail}>
                    {item.kind === "ticket"
                      ? `Severity ${item.severity} · ${item.detail} · ${item.status}`
                      : item.detail}
                  </Text>
                </View>
                {item.kind === "ticket" ? (
                  <Pressable
                    style={styles.viewBtn}
                    onPress={() => {
                      setListOpen(false);
                      openDetail(item);
                    }}
                    hitSlop={8}
                  >
                    <Text style={styles.viewBtnText}>View</Text>
                  </Pressable>
                ) : null}
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.hint}>Nothing nearby yet.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

function dotColor(p: MapPoint, t: Palette) {
  if (p.kind === "bin") return t.bin;
  return p.severity >= 3 ? t.sev3 : p.severity >= 2 ? t.sev2 : t.sev1;
}

function makeStyles(t: Palette) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: t.bg },
    topBar: {
      position: "absolute",
      left: 10,
      right: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    topBarSelector: {
      flex: 1,
      backgroundColor: t.mode === "dark" ? "rgba(20,20,20,.9)" : "rgba(255,255,255,.9)",
      borderRadius: 20,
      paddingVertical: 6,
      paddingHorizontal: 6,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 24,
      backgroundColor: t.bg,
    },
    hint: { color: t.textMuted, textAlign: "center", padding: 16 },
    err: { color: t.danger, textAlign: "center" },
    badge: {
      position: "absolute",
      bottom: 16,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: t.mode === "dark" ? "rgba(20,20,20,.95)" : "rgba(255,255,255,.95)",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 22,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 4,
    },
    badgeText: { color: t.text, fontSize: 13, fontWeight: "700" },
    badgeChevron: { color: t.brand, fontSize: 18, fontWeight: "700", marginTop: -2 },
    sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: "70%",
      backgroundColor: t.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.border,
      marginTop: 8,
      marginBottom: 4,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sheetTitle: { fontSize: 18, fontWeight: "700", color: t.text },
    sheetActions: { flexDirection: "row", alignItems: "center", gap: 16 },
    sheetRefresh: { fontSize: 15, fontWeight: "600", color: t.brand },
    sheetClose: { fontSize: 15, fontWeight: "600", color: t.textMuted },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 60 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    dot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    dotBin: { width: 22, height: 22, borderRadius: 11, marginHorizontal: 5 },
    dotText: { color: "#fff", fontWeight: "700", fontSize: 12 },
    rowBody: { flex: 1 },
    rowTitle: { fontSize: 15, fontWeight: "600", color: t.text },
    rowDetail: { fontSize: 13, color: t.textMuted, marginTop: 2 },
    viewBtn: {
      backgroundColor: t.brand,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 16,
    },
    viewBtnText: { color: t.brandFg, fontWeight: "700", fontSize: 13 },
  });
}
