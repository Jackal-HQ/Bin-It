// Server-only: the "add these bins" what-if.
//
// Preferred path: create a throwaway Neon branch, insert the proposed bins as
// source='proposed', run the coverage query before/after on the branch, and leave the
// branch for DELETE /api/scenarios/{id} to remove. If anything about the branch fails
// (API error, limit, slow endpoint), fall back to computing the same numbers on main
// without writing anything ("calculated" mode), so the demo never dead-ends.
import { neon } from "@neondatabase/serverless";
import { newId, query } from "@/lib/server";

const NEON_API = "https://console.neon.tech/api/v2";
const BRANCH_PREFIX = "scenario-";
const BRANCH_DEADLINE_MS = 20_000; // give up on the branch and fall back after this long
const STALE_BRANCH_MS = 15 * 60_000;
const COVERAGE_RADIUS_M = 150; // assumption shown to staff

export type Point = { lat: number; lng: number };
export type Coverage = { avg_distance_m: number; coverage_150m_pct: number };
export type ScenarioResult = {
  id: string;
  branch_id: string;
  mode: "branch" | "calculated";
  before: Coverage;
  after: Coverage;
};

/** Thrown when the city has nothing to measure; the route maps it to a 409. */
export class ScenarioDataError extends Error {}

type Sql = (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

// ---- coverage SQL ----
// For every cell with demand: distance from its centroid to the nearest bin (KNN over the
// bins GiST index), then demand-weighted average distance and % of demand within 150 m.
const AGGREGATE = `
  SELECT COALESCE(sum(demand * d_before) / NULLIF(sum(demand), 0), 0) AS before_avg,
         COALESCE(100.0 * sum(demand) FILTER (WHERE d_before <= ${COVERAGE_RADIUS_M})
                  / NULLIF(sum(demand), 0), 0) AS before_pct,
         COALESCE(sum(demand * d_after) / NULLIF(sum(demand), 0), 0) AS after_avg,
         COALESCE(100.0 * sum(demand) FILTER (WHERE d_after <= ${COVERAGE_RADIUS_M})
                  / NULLIF(sum(demand), 0), 0) AS after_pct,
         count(*) AS cells,
         count(d_before) AS measured
    FROM dist`;

/** Branch: proposed bins already live in `bins` as source='proposed'. */
const BRANCH_SQL = `
  WITH dist AS (
    SELECT c.demand,
           (SELECT ST_Distance(c.centroid, b.geom) FROM bins b
             WHERE b.city_id = $1 AND b.source <> 'proposed'
             ORDER BY b.geom <-> c.centroid LIMIT 1) AS d_before,
           (SELECT ST_Distance(c.centroid, b.geom) FROM bins b
             WHERE b.city_id = $1
             ORDER BY b.geom <-> c.centroid LIMIT 1) AS d_after
      FROM cell_scores c
     WHERE c.city_id = $1 AND c.demand > 0
  ) ${AGGREGATE}`;

/** Fallback: nothing is written; proposed points come in as arrays. */
const CALCULATED_SQL = `
  WITH proposed AS (
    SELECT ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography AS geom
      FROM unnest($2::float8[], $3::float8[]) AS p(lat, lng)
  ), dist AS (
    SELECT c.demand, e.d AS d_before,
           LEAST(e.d, (SELECT min(ST_Distance(c.centroid, p.geom)) FROM proposed p)) AS d_after
      FROM cell_scores c
      CROSS JOIN LATERAL (
        SELECT ST_Distance(c.centroid, b.geom) AS d FROM bins b
         WHERE b.city_id = $1 AND b.source <> 'proposed'
         ORDER BY b.geom <-> c.centroid LIMIT 1
      ) e
     WHERE c.city_id = $1 AND c.demand > 0
  ) ${AGGREGATE}`;

function coverageFrom(row: Record<string, unknown> | undefined) {
  if (!row || Number(row.cells) === 0) {
    throw new ScenarioDataError("No demand scores are loaded for this city yet");
  }
  if (Number(row.measured) === 0) {
    throw new ScenarioDataError("No existing bins are loaded for this city yet");
  }
  const round = (n: unknown, places: number) => Number(Number(n).toFixed(places));
  return {
    before: { avg_distance_m: round(row.before_avg, 1), coverage_150m_pct: round(row.before_pct, 1) },
    after: { avg_distance_m: round(row.after_avg, 1), coverage_150m_pct: round(row.after_pct, 1) },
  };
}

// ---- Neon API ----

function neonConfig() {
  const key = process.env.NEON_API_KEY;
  const project = process.env.NEON_PROJECT_ID;
  if (!key || !project) return null;
  return { key, project };
}

async function neonApi(path: string, init: RequestInit = {}, timeoutMs = 15_000) {
  const cfg = neonConfig();
  if (!cfg) throw new Error("NEON_API_KEY / NEON_PROJECT_ID are not set");
  return fetch(`${NEON_API}/projects/${cfg.project}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/** Delete scenario branches nobody cleaned up (closed laptop, crashed tab). Best effort. */
async function sweepStaleBranches() {
  try {
    const res = await neonApi(`/branches?search=${BRANCH_PREFIX}`);
    if (!res.ok) return;
    const { branches } = (await res.json()) as {
      branches: { id: string; name: string; created_at: string }[];
    };
    const now = Date.now();
    await Promise.all(
      branches
        .filter((b) => b.name.startsWith(BRANCH_PREFIX) && now - Date.parse(b.created_at) > STALE_BRANCH_MS)
        .map((b) => neonApi(`/branches/${b.id}`, { method: "DELETE" }).catch(() => undefined)),
    );
  } catch {
    // sweeping is optional
  }
}

/** Same database/role/password as DATABASE_URL (branches copy roles), different endpoint host. */
function branchUrl(host: string) {
  const url = new URL(process.env.DATABASE_URL!);
  url.hostname = host;
  return url.toString();
}

async function waitReady(sql: Sql, deadline: number) {
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await sql("SELECT 1");
      return;
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`branch endpoint not ready in time: ${String(lastError)}`);
}

async function runOnBranch(cityId: number, points: Point[]): Promise<ScenarioResult> {
  const deadline = Date.now() + BRANCH_DEADLINE_MS;
  await sweepStaleBranches();

  const name = `${BRANCH_PREFIX}${crypto.randomUUID().slice(0, 8)}`;
  const res = await neonApi("/branches", {
    method: "POST",
    body: JSON.stringify({ branch: { name }, endpoints: [{ type: "read_write" }] }),
  });
  if (!res.ok) throw new Error(`create branch failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const created = (await res.json()) as {
    branch: { id: string };
    endpoints?: { host: string }[];
  };
  const branchId = created.branch.id;

  try {
    const host = created.endpoints?.[0]?.host;
    if (!host) throw new Error("branch was created without an endpoint");
    const client = neon(branchUrl(host));
    const sql: Sql = (text, params = []) =>
      client.query(text, params) as Promise<Record<string, unknown>[]>;

    await waitReady(sql, deadline);
    await sql(
      `INSERT INTO bins (city_id, geom, source)
       SELECT $1, ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326)::geography, 'proposed'
         FROM unnest($2::float8[], $3::float8[]) AS p(lat, lng)`,
      [cityId, points.map((p) => p.lat), points.map((p) => p.lng)],
    );
    const rows = await sql(BRANCH_SQL, [cityId]);
    return { id: `s_${branchId}`, branch_id: branchId, mode: "branch", ...coverageFrom(rows[0]) };
  } catch (e) {
    // The branch is useless to the caller now; do not leave it behind.
    await deleteBranch(branchId).catch(() => undefined);
    throw e;
  }
}

async function runCalculated(cityId: number, points: Point[]): Promise<ScenarioResult> {
  const rows = await query(CALCULATED_SQL, [
    cityId,
    points.map((p) => p.lat),
    points.map((p) => p.lng),
  ]);
  return {
    id: newId("s_calc"),
    branch_id: "none",
    mode: "calculated",
    ...coverageFrom(rows[0]),
  };
}

export async function createScenario(cityId: number, points: Point[]): Promise<ScenarioResult> {
  if (neonConfig() && process.env.DATABASE_URL) {
    try {
      return await runOnBranch(cityId, points);
    } catch (e) {
      if (e instanceof ScenarioDataError) throw e;
      console.error("scenario branch failed, falling back to calculated mode:", e);
    }
  }
  return runCalculated(cityId, points);
}

/** Delete one branch. Refuses anything that is not one of our scenario branches. */
export async function deleteBranch(branchId: string) {
  const info = await neonApi(`/branches/${encodeURIComponent(branchId)}`);
  if (info.status === 404) return; // already gone: DELETE is idempotent
  if (!info.ok) throw new Error(`could not look up branch (${info.status})`);
  const { branch } = (await info.json()) as { branch: { name: string } };
  if (!branch.name.startsWith(BRANCH_PREFIX)) {
    throw new Error("refusing to delete a branch that is not a scenario branch");
  }
  const del = await neonApi(`/branches/${encodeURIComponent(branchId)}`, { method: "DELETE" });
  if (!del.ok && del.status !== 404) throw new Error(`delete failed (${del.status})`);
}
