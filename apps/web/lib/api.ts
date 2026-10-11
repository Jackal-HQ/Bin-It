// Every dashboard request goes through this file. Same-origin API only: the browser never
// talks to Neon, storage, the classifier or Databricks, and reads no secrets.
// NEXT_PUBLIC_USE_CACHE=1 reads saved JSON from /cache/<city>/<endpoint>.json instead
// (written by scripts/save-cache.ts) so the demo survives a dead network.
import type { Bbox, City, Health, Label, Recommendation, Scenario, Status, Ticket, Bin, Cell } from "./types";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const cachedMode = process.env.NEXT_PUBLIC_USE_CACHE === "1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("network", "Could not reach the server. Check the connection or turn on cached-data mode.", 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(err?.code ?? `http_${res.status}`, err?.message ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

async function cached<T>(file: string): Promise<T> {
  try {
    return await request<T>(`/cache/${file}.json`);
  } catch {
    throw new ApiError("no_cache", `No cached data saved for ${file}. Run scripts/save-cache.ts.`, 404);
  }
}

function notInCache(): never {
  throw new ApiError("cached_mode", "Not available in cached-data mode.", 0);
}

function qs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  return p.toString();
}

export type TicketFilters = { status?: Status; label?: Label };

export const api = {
  cities: () =>
    cachedMode ? cached<{ cities: City[] }>("cities") : request<{ cities: City[] }>("/api/cities"),

  health: (): Promise<Health> =>
    cachedMode
      ? Promise.resolve({ database: "cached", classifier: "cached", use_mocks: false })
      : request<Health>("/api/health"),

  tickets: (city: string, f: TicketFilters) =>
    cachedMode
      ? cached<{ tickets: Ticket[] }>(`${city}/tickets`)
      : request<{ tickets: Ticket[] }>(`/api/tickets?${qs({ city, status: f.status, label: f.label })}`),

  nearby: (city: string, bbox: Bbox) =>
    cachedMode
      ? cached<{ tickets: Ticket[]; bins: Bin[] }>(`${city}/nearby`)
      : request<{ tickets: Ticket[]; bins: Bin[] }>(`/api/reports/nearby?${qs({ city, bbox: bbox.join(",") })}`),

  cells: (city: string) =>
    cachedMode ? cached<{ cells: Cell[] }>(`${city}/cells`) : request<{ cells: Cell[] }>(`/api/cells?${qs({ city })}`),

  recommendations: (city: string) =>
    cachedMode
      ? cached<{ recommendations: Recommendation[] }>(`${city}/recommendations`)
      : request<{ recommendations: Recommendation[] }>(`/api/recommendations?${qs({ city })}`),

  patchTicket: (id: string, status: Status, staffKey: string) =>
    cachedMode
      ? notInCache()
      : request<{ ticket: { id: string; status: Status } }>(`/api/tickets/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Staff-Key": staffKey },
          body: JSON.stringify({ status }),
        }),

  createScenario: (city: string, proposed_bins: { lat: number; lng: number }[]) =>
    cachedMode
      ? notInCache()
      : request<{ scenario: Scenario }>("/api/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, proposed_bins }),
        }),

  deleteScenario: (id: string) =>
    request<void>(`/api/scenarios/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /** Fire-and-forget delete that survives the page closing. */
  deleteScenarioOnExit: (id: string) => {
    fetch(`/api/scenarios/${encodeURIComponent(id)}`, { method: "DELETE", keepalive: true }).catch(() => {});
  },
};
