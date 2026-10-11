import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useCity } from "@/lib/city";
import { useCities, useNearby } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { mapHtml, streetViewUrl, type MapMessage, type MapPoint } from "@/lib/mapHtml";
import { labelText } from "@/lib/types";
import { colors, font, radius, severityColor, severityText, shadow } from "@/lib/theme";
import { CitySelector } from "@/components/CitySelector";
import { Call311Button } from "@/components/Call311Button";
import { Button, DemoChip, Led, T } from "@/components/ui";

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
  const insets = useSafeAreaInsets();
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

  const bottomGap = Math.max(insets.bottom, 8) + 76; // clears the floating tab bar

  if (!coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.charcoal} />
        <T v="body" color={colors.soft} style={styles.hint}>
          Finding your location…
        </T>
        {locationError ? (
          <T v="meta" color={colors.coralInk} style={styles.hint}>
            {locationError}
          </T>
        ) : null}
      </View>
    );
  }

  const ticketCount = data?.tickets.length ?? 0;
  const binCount = data?.bins.length ?? 0;

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      {/* header on the ground: city pills + the city's 311 line */}
      <View style={styles.topBar}>
        <View style={styles.topBarCity}>
          <CitySelector floating />
        </View>
        <View style={styles.topBarSpacer} />
        <Call311Button compact />
      </View>

      {/* the map sits in a rounded card, in the same place as the dashboard's */}
      <View style={[styles.mapShadow, { marginBottom: bottomGap }]}>
        <View style={styles.mapCard}>
          <WebView
            ref={webRef}
            style={styles.flex}
            originWhitelist={["*"]}
            source={{ html: mapHtml(coords, points, deviceCoords) }}
            onMessage={onMessage}
            javaScriptEnabled
          />

          {isLoading ? (
            <View style={[styles.badge, shadow.float]}>
              <ActivityIndicator size="small" color={colors.charcoal} />
              <T v="meta" color={colors.strong} style={styles.badgeText}>
                Loading nearby…
              </T>
            </View>
          ) : error ? (
            <View style={[styles.badge, shadow.float]}>
              <T v="meta" color={colors.coralInk} style={styles.badgeText}>
                Could not load nearby reports.
              </T>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Show nearby list"
              onPress={() => setListOpen(true)}
              disabled={ticketCount + binCount === 0}
              style={({ pressed }) => [styles.badge, shadow.float, pressed && { opacity: 0.85 }]}
            >
              {isRefetching ? <ActivityIndicator size="small" color={colors.charcoal} /> : null}
              <T v="meta" color={colors.strong} style={styles.badgeText}>
                {ticketCount} report{ticketCount === 1 ? "" : "s"} · {binCount} bin{binCount === 1 ? "" : "s"}
              </T>
              {ticketCount + binCount > 0 ? <MaterialCommunityIcons name="chevron-right" size={18} color={colors.soft} /> : null}
            </Pressable>
          )}
        </View>
      </View>

      <Modal visible={listOpen} animationType="slide" transparent onRequestClose={() => setListOpen(false)}>
        <Pressable accessibilityLabel="Close list" style={styles.sheetBackdrop} onPress={() => setListOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <T v="eyebrow">Near you</T>
              <T v="heading" style={styles.sheetTitle}>
                Nearby
              </T>
            </View>
            <View style={styles.sheetActions}>
              <Button kind="ghost" compact icon="refresh" label="Refresh" onPress={() => refetch()} loading={isRefetching} disabled={isRefetching} />
              <Button compact label="Close" onPress={() => setListOpen(false)} />
            </View>
          </View>
          <FlatList
            data={points}
            keyExtractor={(p) => `${p.kind}_${p.id}`}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.charcoal} colors={[colors.charcoal]} />
            }
            renderItem={({ item, index }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => focusOnMap(index)}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.well }]}
              >
                <View style={styles.markerSlot}>
                  {item.kind === "ticket" ? (
                    <View style={[styles.marker, { backgroundColor: severityColor(item.severity) }]}>
                      <Text style={styles.markerText}>{item.count}</Text>
                    </View>
                  ) : (
                    <View style={styles.binDot} />
                  )}
                </View>
                <View style={styles.rowMain}>
                  <View style={styles.rowTitle}>
                    <T v="row">{item.title}</T>
                    {item.demo ? <DemoChip /> : null}
                  </View>
                  {item.kind === "ticket" ? (
                    <View style={styles.rowMeta}>
                      <Led severity={item.severity} />
                      <T v="meta">
                        {severityText(item.severity)} · {item.detail} · {item.status}
                      </T>
                    </View>
                  ) : (
                    <T v="meta">{item.detail}</T>
                  )}
                </View>
                {item.kind === "ticket" ? (
                  <Button
                    compact
                    label="View"
                    onPress={() => {
                      setListOpen(false);
                      openDetail(item);
                    }}
                  />
                ) : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="map-marker-off-outline" size={28} color={colors.quiet} />
                <T v="body" color={colors.soft} style={styles.empty}>
                  Nothing nearby yet. Pull down to refresh.
                </T>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  topBarCity: { flexShrink: 1, minWidth: 0 },
  topBarSpacer: { flex: 1 },
  mapShadow: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: radius.map,
    backgroundColor: "#F4F0E8",
    ...shadow.float,
  },
  mapCard: { flex: 1, borderRadius: radius.map, overflow: "hidden", backgroundColor: "#F4F0E8" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  hint: { textAlign: "center" },
  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.float,
  },
  badgeText: { fontFamily: font.ui700 },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(30,29,26,0.35)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "72%",
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    backgroundColor: colors.card,
    paddingHorizontal: 8,
  },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.rim, marginTop: 10, marginBottom: 6 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8 },
  sheetTitle: { marginTop: 2 },
  sheetActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  listContent: { paddingBottom: 8 },
  separator: { height: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: radius.row },
  markerSlot: { width: 38, alignItems: "center" },
  marker: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  markerText: { fontFamily: font.ui800, fontSize: 13, color: "#FFFFFF" },
  binDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.bin, borderWidth: 1.5, borderColor: "#FFFFFF" },
  rowMain: { flex: 1, gap: 5 },
  rowTitle: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  rowMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  empty: { textAlign: "center", padding: 12 },
  emptyWrap: { alignItems: "center", paddingVertical: 32 },
});
