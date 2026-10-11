// Geo helpers shared by the screens.
import type { City } from "@/lib/types";

export type LatLng = { lat: number; lng: number };

/** Great-circle distance in km. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Whether a point is within a city's area for the purpose of reporting.
 *
 * The city bbox in data/cities is a rough rectangle; we accept the bbox grown by a
 * small margin so edge neighbourhoods (and GPS jitter) are not rejected. If the city
 * has no bbox we fall back to a generous radius from its center.
 */
export function isInCityArea(point: LatLng, city: City | undefined, marginDeg = 0.1): boolean {
  if (!city) return false;
  const bbox = city.bbox;
  if (bbox && bbox.length === 4 && bbox.every((n) => Number.isFinite(n))) {
    const [west, south, east, north] = bbox;
    return (
      point.lng >= west - marginDeg &&
      point.lng <= east + marginDeg &&
      point.lat >= south - marginDeg &&
      point.lat <= north + marginDeg
    );
  }
  if (city.center) return distanceKm(point, city.center) <= 60;
  return false;
}
