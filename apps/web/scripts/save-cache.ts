// Save live API responses for cached-data mode (NEXT_PUBLIC_USE_CACHE=1).
// Run once the real data is loaded (after Gate 3), from apps/web:
//   node --experimental-strip-types scripts/save-cache.ts https://<your-app>.vercel.app
// Writes public/cache/cities.json and public/cache/<city>/{tickets,nearby,cells,recommendations}.json.
// Nearby uses each city's whole bbox (the API caps it at 200 tickets + 200 bins).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type City = { slug: string; bbox: [number, number, number, number] };

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "cache");

async function get(path: string) {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

function save(file: string, data: unknown) {
  const path = join(outDir, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data));
  console.log("saved", path);
}

const health = await get("/api/health");
if (health.use_mocks) console.warn("WARNING: the API is serving mocks (USE_MOCKS=1); the cache will hold mock data.");

const { cities } = (await get("/api/cities")) as { cities: City[] };
save("cities.json", { cities });

for (const c of cities) {
  const q = `city=${encodeURIComponent(c.slug)}`;
  save(`${c.slug}/tickets.json`, await get(`/api/tickets?${q}`));
  save(`${c.slug}/nearby.json`, await get(`/api/reports/nearby?${q}&bbox=${c.bbox.join(",")}`));
  save(`${c.slug}/cells.json`, await get(`/api/cells?${q}`));
  save(`${c.slug}/recommendations.json`, await get(`/api/recommendations?${q}`));
}
