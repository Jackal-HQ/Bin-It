# Bin-It mobile (Expo)

Residents photo-report overflowing trash bins. Expo (React Native) + Expo Router +
TypeScript, built to run in **Expo Go**. The app only ever talks to the Bin-It API;
it never touches the database, storage, classifier, or Databricks directly.

## Screens

- **Report** (`app/(tabs)/index.tsx`) — pick a city, take or choose a photo (resized to a
  ≤1600 px JPEG), tag it with the current location, and `POST /api/reports`. The result
  alert shows the classifier label/severity and whether it merged into a nearby ticket.
- **Nearby** (`app/(tabs)/nearby.tsx`) — a `react-native-maps` map of tickets (color-coded
  by severity) and bins from `GET /api/reports/nearby`. Synthetic tickets are marked "demo data".
- **Report detail** (`app/report/[id].tsx`) — one report from `GET /api/reports/{id}`.

## Setup

```powershell
cd apps/mobile
npm install
copy .env.local.example .env.local   # then edit EXPO_PUBLIC_API_BASE
npx expo start                        # add --tunnel if wifi blocks device-to-laptop traffic
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

## Environment

| Var | Purpose |
| --- | --- |
| `EXPO_PUBLIC_API_BASE` | Base URL of the Bin-It API (deployed `apps/web`, or a LAN/tunnel URL). |

`EXPO_PUBLIC_*` vars are inlined into the client bundle and are **public** — never put
secrets here. The app adds an anonymous `X-Device-Id` (a random UUID stored with
`expo-secure-store`) to every request. No accounts, ever.

## Where things live

```
app/_layout.tsx        providers (TanStack Query, city, safe area) + navigation stack
app/(tabs)/            Report + Nearby tabs
app/report/[id].tsx    report detail
lib/types.ts           types mirroring docs/api.md (keep in sync with apps/web/lib/types.ts)
lib/api.ts             the only network module (base URL + X-Device-Id + error handling)
lib/hooks.ts           TanStack Query hooks
lib/device.ts          anonymous device id
lib/city.ts(x)         selected-city context, persisted
lib/location.ts        location permission + current coords
```

## Contract sync

If a response shape changes, update `docs/api.md`, `mocks/`, `apps/web/lib/types.ts`, and
`apps/mobile/lib/types.ts` in the same change.
