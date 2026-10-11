// A local history of the reports this device has submitted. There is no "my reports"
// API (the app is accountless), so we keep a lightweight list on the device: just the
// report id plus enough to render a row. The detail screen still fetches the full
// report from GET /api/reports/{id}.
import * as SecureStore from "expo-secure-store";

const KEY = "binit_my_reports";
const MAX = 50;

export type MyReport = {
  id: string;
  city: string;
  label: string;
  severity: number;
  created_at: string; // ISO
};

export async function getMyReports(): Promise<MyReport[]> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MyReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addMyReport(r: MyReport): Promise<MyReport[]> {
  const existing = await getMyReports();
  // newest first, de-duplicated by id, capped
  const next = [r, ...existing.filter((e) => e.id !== r.id)].slice(0, MAX);
  await SecureStore.setItemAsync(KEY, JSON.stringify(next));
  return next;
}
