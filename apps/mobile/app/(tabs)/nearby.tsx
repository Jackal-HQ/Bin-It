import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  List,
  Surface,
  Text,
  TouchableRipple,
} from "react-native-paper";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCity } from "@/lib/city";
import { useCities, useNearby } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { mapHtml, streetViewUrl, type MapMessage, type MapPoint } from "@/lib/mapHtml";
import { labelText } from "@/lib/types";
import { useTheme, type Palette } from "@/lib/theme";
import { useThemePref } from "@/lib/themePref";
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
  const { pref, setPref } = useThemePref();
  const { city } = useCity();
  const { data: cities } = useCities();
  const webRef = useRef<WebView>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // The phone's real GPS fix (null until/unless we get one). Distinct from `coords`,
  // which is the map center and may fall back to the city when the phone is far away.
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const cityInfo = cities?.find((c) => c.slug === city);
  const cityCenter = cityInfo?.center ?? null;

  useEffect(() => {
    let active = true;
    getCurrentCoords()
      .then((c) => {
        if (!active) return;
        setDeviceCoords(c); // real phone location, used for the "you are here" dot
        // The city bbox in data/cities is rough (UCF falls outside Orlando's), so judge
        // "in the city" by distance from the center instead.
        const nearCity = !cityCenter || distanceKm(c, cityCenter) <= NEAR_CITY_KM;
        setCoords(nearCity ? c : cityCenter);
      })
      .catch((e) => {
        if (active) {
          setDeviceCoords(null);
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
        source={{ html: mapHtml(coords, points, t.mode === "dark", deviceCoords) }}
        onMessage={onMessage}
        javaScriptEnabled
      />

      {/* top bar: city picker (menu) + per-city 311 call + theme toggle, over the map */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <CitySelector variant="menu" />
        <View style={styles.topBarSpacer} />
        <Call311Button compact />
        <Surface style={styles.themeBtn} elevation={3}>
          <IconButton
            icon={pref === "dark" ? "weather-night" : pref === "light" ? "white-balance-sunny" : "cellphone"}
            size={20}
            onPress={() => setPref(pref === "system" ? "light" : pref === "light" ? "dark" : "system")}
            accessibilityLabel={`Theme: ${pref}. Tap to change.`}
            style={styles.themeBtnInner}
          />
        </Surface>
      </View>

      {isLoading ? (
        <Surface style={styles.badge} elevation={3}>
          <ActivityIndicator size="small" />
          <Text style={styles.badgeText}>Loading nearby…</Text>
        </Surface>
      ) : error ? (
        <Surface style={styles.badge} elevation={3}>
          <Text style={styles.badgeText}>Could not load nearby reports.</Text>
        </Surface>
      ) : (
        <Surface style={styles.badgeSurface} elevation={3}>
          <TouchableRipple
            onPress={() => setListOpen(true)}
            disabled={ticketCount + binCount === 0}
            style={styles.badge}
            borderless
          >
            <View style={styles.badgeInner}>
              {isRefetching ? <ActivityIndicator size="small" /> : null}
              <Text style={styles.badgeText}>
                {ticketCount} report{ticketCount === 1 ? "" : "s"} · {binCount} bin
                {binCount === 1 ? "" : "s"}
              </Text>
              {ticketCount + binCount > 0 ? (
                <List.Icon icon="chevron-right" color={t.brand} style={styles.badgeChevron} />
              ) : null}
            </View>
          </TouchableRipple>
        </Surface>
      )}

      <Modal
        visible={listOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setListOpen(false)}
      >
        <TouchableRipple style={styles.sheetBackdrop} onPress={() => setListOpen(false)}>
          <View />
        </TouchableRipple>
        <Surface style={styles.sheet} elevation={4}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text variant="titleMedium">Nearby</Text>
            <View style={styles.sheetActions}>
              <Button
                mode="text"
                icon="refresh"
                onPress={() => refetch()}
                loading={isRefetching}
                disabled={isRefetching}
                compact
              >
                Refresh
              </Button>
              <Button mode="text" onPress={() => setListOpen(false)} compact>
                Close
              </Button>
            </View>
          </View>
          <FlatList
            data={points}
            keyExtractor={(p) => `${p.kind}_${p.id}`}
            ItemSeparatorComponent={() => <Divider />}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={() => refetch()}
                tintColor={t.brand}
                colors={[t.brand]}
              />
            }
            renderItem={({ item, index }) => (
              <List.Item
                title={`${item.title}${item.demo ? "  · demo" : ""}`}
                description={
                  item.kind === "ticket"
                    ? `Severity ${item.severity} · ${item.detail} · ${item.status}`
                    : item.detail
                }
                onPress={() => focusOnMap(index)}
                left={() => (
                  <View style={[styles.dot, { backgroundColor: dotColor(item, t) }, item.kind === "bin" && styles.dotBin]}>
                    {item.kind === "ticket" ? <Text style={styles.dotText}>{item.count}</Text> : null}
                  </View>
                )}
                right={() =>
                  item.kind === "ticket" ? (
                    <Button
                      mode="contained-tonal"
                      compact
                      onPress={() => {
                        setListOpen(false);
                        openDetail(item);
                      }}
                    >
                      View
                    </Button>
                  ) : null
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <List.Icon icon="map-marker-off" color={t.textMuted} />
                <Text style={[styles.empty, { color: t.textMuted }]}>
                  Nothing nearby yet. Pull down to refresh.
                </Text>
              </View>
            }
          />
        </Surface>
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
    topBarSpacer: { flex: 1 },
    themeBtn: { borderRadius: 20 },
    themeBtnInner: { margin: 0 },
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
    badgeSurface: {
      position: "absolute",
      bottom: 16,
      alignSelf: "center",
      borderRadius: 22,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    badgeInner: { flexDirection: "row", alignItems: "center", gap: 8 },
    badgeText: { color: t.text, fontSize: 13, fontWeight: "700" },
    badgeChevron: { margin: 0, width: 20, height: 20 },
    sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    sheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: "70%",
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
      paddingVertical: 6,
    },
    sheetActions: { flexDirection: "row", alignItems: "center" },
    empty: { textAlign: "center", padding: 24 },
    emptyWrap: { alignItems: "center", paddingVertical: 32 },
    dot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginLeft: 8,
    },
    dotBin: { width: 22, height: 22, borderRadius: 11, marginHorizontal: 13 },
    dotText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  });
}
