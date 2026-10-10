// Thin wrapper over expo-location: ask permission, return current coordinates.
import * as Location from "expo-location";

export type Coords = { lat: number; lng: number };

export async function getCurrentCoords(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission is required to tag your report.");
  }
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
