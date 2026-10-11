# Bin-It mobile (Expo)

Residents photo-report overflowing trash bins. Expo SDK 57 (React Native) + Expo Router +
TypeScript, built to run in **Expo Go**. The app only ever talks to the Bin-It API;
it never touches the database, storage, classifier, or Databricks directly.

## Screens

- **Report** (`app/(tabs)/index.tsx`) — pick a city, take or choose a photo (resized to a
  ≤1600 px JPEG), tag it with the device's GPS location, and `POST /api/reports`. The result
  alert shows the classifier label/severity and whether it merged into a nearby ticket.
  A "Call 311" button dials the selected city's non-emergency line.
- **Nearby** (`app/(tabs)/nearby.tsx`) — a map plus a list of tickets (numbered pins, colored
  by severity) and bins from `GET /api/reports/nearby`. Seeded tickets are marked "Demo data".
  Tapping a pin opens a popup with a photo thumbnail, **View report**, and **Open in Street
  View**; tapping a list row pans to that pin.
- **Ticket detail** (`app/ticket/[id].tsx`) — a ticket opened from the map, rendered from data
  the Nearby screen already has (including `photo_url`).
- **Report detail** (`app/report/[id].tsx`) — one report from `GET /api/reports/{id}`.

## The map

The Nearby map is **MapLibre GL JS inside a `react-native-webview`**, built by
`lib/mapHtml.ts`. It uses OpenFreeMap's keyless vector "Liberty" style and falls back to plain
OpenStreetMap tiles if that style cannot load. There is **no map API key and no Google Cloud
account**; the native `react-native-maps` view is not used (it rendered a black screen in
Expo Go).

- The page needs internet access: MapLibre loads from unpkg.com, tiles from OpenFreeMap / OSM.
- Pins post a message back to the app (`MapMessage` in `lib/mapHtml.ts`). **Open in Street
  View** launches Google Maps through a plain `maps/@?api=1&map_action=pano` URL, which needs
  no key. Coverage varies; where none exists Google shows the map instead.
- Dark mode darkens the canvas with a CSS filter (the style has no dark variant).
- OpenFreeMap is a free public service provided as-is. OSM's tile policy suits demo traffic only.

### What Nearby asks the API for

It requests the **whole city's bbox plus about 5 km around the phone**, not a small circle, so
the demo clusters and the user's own reports are both in view. If the phone is more than 60 km
from the selected city's center (or location is denied), the map centers on the city instead.
Reports are always saved at the device GPS location, not at the city picker's location, so
pick the city you are actually in.

## Setup

```powershell
cd apps/mobile                        # run Expo from THIS folder, not the repo root
npm install
copy .env.local.example .env.local   # then set EXPO_PUBLIC_API_BASE
npx expo start -c                     # -c clears the cache after changing env vars
```

Install the current **Expo Go** from the store; a phone's Expo Go supports one SDK at a time,
and this project is SDK 57. Scan the QR code with Expo Go (Android) or the Camera app (iOS).
The phone and laptop must be on the same network; use `--tunnel` only if that network blocks
device-to-laptop traffic.

## Environment

| Var | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_BASE` | Base URL of the Bin-It API: the deployed `apps/web` on Vercel, not `localhost` (a phone cannot reach your laptop's localhost). |

`EXPO_PUBLIC_*` vars are inlined into the client bundle and are **public** — never put
secrets here. The app adds an anonymous `X-Device-Id` (a random UUID stored with
`expo-secure-store`) to every request. No accounts, ever.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `ConfigError: ... package.json does not exist` | You ran Expo from the repo root. `cd apps/mobile`. |
| Expo Go says the project is an incompatible SDK | Store Expo Go and the project must match (project is SDK 57). Do not downgrade the app to fit an old Expo Go without telling the team. |
| "Unsupported FormDataPart implementation" when sending a report | SDK 57's global `fetch` rejects React Native's `{ uri, name, type }` file parts. `lib/api.ts` sends the photo via `expo-file-system`'s `File` instead; keep that approach. |
| Map is blank or says "API KEY REQUIRED" | That was CARTO's basemap, which now needs a key. The app no longer uses it. Restart with `npx expo start -c`; if still blank, check the phone's internet access. |
| Nearby shows 0 reports | The city may have none yet (NYC and Chicago only have seeded demo data), or `EXPO_PUBLIC_API_BASE` points at a deployment with `USE_MOCKS=1`. |
| "Cannot connect to Expo CLI" warning | The hot-reload socket over the tunnel. The app still works; shake the phone and tap Reload, or avoid `--tunnel` on a shared wifi. |
| Report location is off | The app asks for high-accuracy GPS (`lib/location.ts`); test outdoors. An emulator reports whatever location you set in its Location panel. |

## Where things live

```text
app/_layout.tsx        providers (TanStack Query, city, theme, safe area) + navigation stack
app/(tabs)/            Report + Nearby tabs
app/ticket/[id].tsx    ticket detail (from the Nearby map/list)
app/report/[id].tsx    report detail
components/            CitySelector, Call311Button
lib/types.ts           types mirroring docs/api.md (keep in sync with apps/web/lib/types.ts)
lib/api.ts             the only network module (base URL + X-Device-Id + error handling)
lib/hooks.ts           TanStack Query hooks
lib/mapHtml.ts         the MapLibre page + Street View URL + WebView message types
lib/cityInfo.ts        per-city 311 contact (config only)
lib/theme.ts           light/dark palettes
lib/device.ts          anonymous device id
lib/city.tsx           selected-city context, persisted
lib/location.ts        location permission + current coords (high accuracy)
```

## Contract sync

If a response shape changes, update `docs/api.md`, `mocks/`, `apps/web/lib/types.ts`, and
`apps/mobile/lib/types.ts` in the same change.

```powershell
npm run typecheck     # tsc --noEmit
```
