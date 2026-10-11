// A local history of the reports this device has submitted. There is no "my reports"
// API (the app is accountless), so we keep a lightweight list on the device: just the
// report id plus enough to render a row. Status is the owning ticket's status, refreshed
// on demand from GET /api/reports/{id}.
import * as SecureStore from "expo-secure-store";
import { getReport } from "@/lib/api";
import type { Status } from "@/lib/types";

const KEY = "binit_my_reports";
const MAX = 50;

export type MyReport = {
  id: string;
  city: string;
  label: string;
  severity: number;
  created_at: string; // ISO
  status?: Status; // owning ticket status; undefined until first fetched
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

async function save(list: MyReport[]): Promise<MyReport[]> {
  const capped = list.slice(0, MAX);
  await SecureStore.setItemAsync(KEY, JSON.stringify(capped));
  return capped;
}

export async function addMyReport(r: MyReport): Promise<MyReport[]> {
  const existing = await getMyReports();
  // newest first, de-duplicated by id, capped
  return save([r, ...existing.filter((e) => e.id !== r.id)]);
}

/**
 * Re-fetch each stored report's current status from the API and persist it.
 * Failures per report are ignored (keep the last-known status). Returns the
 * updated list.
 */
export async function refreshMyReportStatuses(): Promise<MyReport[]> {
  const list = await getMyReports();
  const updated = await Promise.all(
    list.map(async (r) => {
      try {
        const fresh = await getReport(r.id);
        return { ...r, status: fresh.status ?? r.status };
      } catch {
        return r; // network/404: keep what we have
      }
    }),
  );
  return save(updated);
}
