import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useRouter } from "expo-router";
import { useCity } from "@/lib/city";
import { useCities, useNearby } from "@/lib/hooks";
import { getCurrentCoords } from "@/lib/location";
import { labelText } from "@/lib/types";

export default function NearbyScreen() {
  const router = useRouter();
  const { city } = useCity();
  const { data: cities } = useCities();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Center on the device if possible; otherwise fall back to the city center.
  const cityCenter = cities?.find((c) => c.slug === city)?.center ?? null;

  useEffect(() => {
    let active = true;
    getCurrentCoords()
      .then((c) => active && setCoords(c))
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
  }, [cityCenter?.lat, cityCenter?.lng]);

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

  return (
    <View style={styles.flex}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.flex}
        initialRegion={{
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
      >
        {(data?.tickets ?? []).map((t) => (
          <Marker
            key={t.id}
            coordinate={{ latitude: t.lat, longitude: t.lng }}
            pinColor={t.max_severity >= 3 ? "red" : t.max_severity >= 2 ? "orange" : "yellow"}
            title={`${labelText(t.label)}${t.is_synthetic ? " (demo data)" : ""}`}
            description={`Severity ${t.max_severity} · ${t.report_count} report${
              t.report_count === 1 ? "" : "s"
            } · ${t.status}`}
          />
        ))}
        {(data?.bins ?? []).map((b) => (
          <Marker
            key={b.id}
            coordinate={{ latitude: b.lat, longitude: b.lng }}
            pinColor="green"
            title={`Bin (${b.source})`}
          />
        ))}
      </MapView>

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
