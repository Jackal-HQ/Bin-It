// Thin wrapper over expo-location: ask permission, return current coordinates.
import * as Location from "expo-location";

export type Coords = { lat: number; lng: number };

export async function getCurrentCoords(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission is required to tag your report.");
  }
  // Balanced can resolve to a wifi/cell estimate that is hundreds of metres off; reports
  // are merged by a 50 m radius, so ask for a real GPS fix.
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
