import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { useCity } from "@/lib/city";
import { useCities, useNearby } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { labelText } from "@/lib/types";

type Point = { lat: number; lng: number; color: string; title: string; description: string };

// The map is Leaflet + OpenStreetMap tiles inside a WebView: no Google Maps key, and no
// dependency on a native map module (the native MapView rendered black under Expo Go).
function mapHtml(center: { lat: number; lng: number }, points: Point[]) {
  // "<" is escaped so no title can close the script tag.
  const data = JSON.stringify(points).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#map{height:100%;margin:0}</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map = L.map("map").setView([${center.lat}, ${center.lng}], 15);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);
L.circleMarker([${center.lat}, ${center.lng}], {radius: 6, color: "#1d4ed8", fillColor: "#3b82f6", fillOpacity: 1}).addTo(map);
var points = ${data};
points.forEach(function (p) {
  var m = L.circleMarker([p.lat, p.lng], {radius: 10, color: "#111", weight: 1, fillColor: p.color, fillOpacity: 0.9}).addTo(map);
  var box = document.createElement("div");
  var b = document.createElement("b"); b.textContent = p.title;
  box.appendChild(b); box.appendChild(document.createElement("br"));
  box.appendChild(document.createTextNode(p.description));
  m.bindPopup(box);
});
</script></body></html>`;
}

export default function NearbyScreen() {
  const router = useRouter();
  const { city } = useCity();
  const { data: cities } = useCities();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Center on the device if possible; otherwise (no GPS, or the device is outside the
  // selected city) fall back to the city center so the map always shows that city's data.
  const cityInfo = cities?.find((c) => c.slug === city);
  const cityCenter = cityInfo?.center ?? null;
  const cityBbox = cityInfo?.bbox ?? null;

  useEffect(() => {
    let active = true;
    getCurrentCoords()
      .then((c) => {
        if (!active) return;
        const inCity =
          !cityBbox ||
          (c.lng >= cityBbox[0] && c.lat >= cityBbox[1] && c.lng <= cityBbox[2] && c.lat <= cityBbox[3]);
        setCoords(inCity || !cityCenter ? c : cityCenter);
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
    // re-run when the resolved city center first becomes available
  }, [cityCenter?.lat, cityCenter?.lng, city]);

  const { data, isLoading, error } = useNearby({
    city,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    radiusM: 2000,
  });

  if (!coords) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.hint}>Finding your location…</Text>
        {locationError ? <Text style={styles.err}>{locationError}</Text> : null}
      </View>
    );
  }

  const points: Point[] = [
    ...(data?.tickets ?? []).map((t) => ({
      lat: t.lat,
      lng: t.lng,
      color: t.max_severity >= 3 ? "#dc2626" : t.max_severity >= 2 ? "#f97316" : "#facc15",
      title: `${labelText(t.label)}${t.is_synthetic ? " (demo data)" : ""}`,
      description: `Severity ${t.max_severity} · ${t.report_count} report${
        t.report_count === 1 ? "" : "s"
      } · ${t.status}`,
    })),
    ...(data?.bins ?? []).map((b) => ({
      lat: b.lat,
      lng: b.lng,
      color: "#16a34a",
      title: `Bin (${b.source})`,
      description: "Existing bin",
    })),
  ];

  return (
    <View style={styles.flex}>
      <WebView
        style={styles.flex}
        originWhitelist={["*"]}
        source={{ html: mapHtml(coords, points) }}
        javaScriptEnabled
      />

      {isLoading ? (
        <View style={styles.badge}>
          <ActivityIndicator size="small" />
          <Text style={styles.badgeText}>Loading nearby…</Text>
        </View>
      ) : error ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Could not load nearby reports.</Text>
        </View>
      ) : (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {data?.tickets.length ?? 0} reports · {data?.bins.length ?? 0} bins
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  hint: { color: "#6b7280" },
  err: { color: "#b91c1c", textAlign: "center" },
  badge: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: { color: "#374151", fontSize: 13, fontWeight: "600" },
});
