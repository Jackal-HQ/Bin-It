"""Load one city's Databricks gold exports into Neon.

Usage:  python db/load_gold.py orlando

Reads three CSV files from data/gold/<slug>/ and replaces that city's rows, so it is
safe to rerun. Everything for the city is written in ONE transaction: if any file is
missing or malformed, nothing in Neon changes.

  cell_scores.csv     h3_cell, lat, lng, expected_overflow, reports_per_1k, under_reported, demand
  bins.csv            lat, lng, source            (source: osm | city)
  bin_candidates.csv  rank, lat, lng, gain, nearest_bin_m, nearby_reports

Needs DATABASE_URL (in .env.local). Port 5432 is blocked on school wifi: use a hotspot.
Rerunning clears bin_candidates.rationale: run data/explain.py again afterwards.
"""
import csv
import os
import sys

import psycopg
from dotenv import load_dotenv

load_dotenv(".env.local")

COLUMNS = {
    "cell_scores": ["h3_cell", "lat", "lng", "expected_overflow", "reports_per_1k",
                    "under_reported", "demand"],
    "bins": ["lat", "lng", "source"],
    "bin_candidates": ["rank", "lat", "lng", "gain", "nearest_bin_m", "nearby_reports"],
}
LOADABLE_BIN_SOURCES = {"osm", "city"}   # 'proposed' only ever lives on scenario branches
POINT = "ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography"


def fail(message):
    sys.exit(f"error: {message}")


def read_csv(slug, name):
    path = f"data/gold/{slug}/{name}.csv"
    if not os.path.exists(path):
        fail(f"missing {path} (export it from Databricks first)")
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        missing = [c for c in COLUMNS[name] if c not in (reader.fieldnames or [])]
        if missing:
            fail(f"{path} is missing column(s): {', '.join(missing)} "
                 f"(found: {', '.join(reader.fieldnames or [])})")
        rows = list(reader)
    if not rows:
        fail(f"{path} has no rows")
    return rows


def number(value, where):
    try:
        return float(value)
    except (TypeError, ValueError):
        fail(f"{where}: expected a number, got {value!r}")


def optional_number(value, where):
    """Blank or NaN means unknown (stored as NULL); anything else must be a number."""
    if str(value).strip().lower() in ("", "nan", "none", "null"):
        return None
    return number(value, where)


def boolean(value, where):
    v = str(value).strip().lower()
    if v in ("true", "1", "t", "yes"):
        return True
    if v in ("false", "0", "f", "no", ""):
        return False
    fail(f"{where}: expected true/false, got {value!r}")


def main():
    if len(sys.argv) != 2:
        fail("usage: python db/load_gold.py <city slug>")
    slug = sys.argv[1]

    scores = read_csv(slug, "cell_scores")
    bins = read_csv(slug, "bins")
    candidates = read_csv(slug, "bin_candidates")

    # Parse everything before touching the database.
    score_rows = [
        (r["h3_cell"], number(r["lng"], f"cell_scores row {i}"), number(r["lat"], f"cell_scores row {i}"),
         number(r["expected_overflow"], f"cell_scores row {i}"),
         optional_number(r["reports_per_1k"], f"cell_scores row {i}"),
         boolean(r["under_reported"], f"cell_scores row {i}"),
         number(r["demand"], f"cell_scores row {i}"))
        for i, r in enumerate(scores, start=2)
    ]
    bin_rows = []
    for i, r in enumerate(bins, start=2):
        if r["source"] not in LOADABLE_BIN_SOURCES:
            fail(f"bins.csv row {i}: source must be osm or city, got {r['source']!r}")
        bin_rows.append((number(r["lng"], f"bins row {i}"), number(r["lat"], f"bins row {i}"), r["source"]))
    cand_rows = [
        (int(number(r["rank"], f"bin_candidates row {i}")),
         number(r["lng"], f"bin_candidates row {i}"), number(r["lat"], f"bin_candidates row {i}"),
         number(r["gain"], f"bin_candidates row {i}"),
         number(r["nearest_bin_m"], f"bin_candidates row {i}"),
         int(number(r["nearby_reports"], f"bin_candidates row {i}")))
        for i, r in enumerate(candidates, start=2)
    ]
    if all(r[4] is None for r in score_rows):
        print("warning: reports_per_1k is blank for every cell; loading it as NULL "
              "(the under-reported layer needs population data from the pipeline)")
    ids = [r[0] for r in score_rows]
    if len(ids) != len(set(ids)):
        fail("cell_scores.csv has duplicate h3_cell values")

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
        cur.execute("SELECT id, bbox FROM cities WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if not row:
            fail(f"no city {slug!r} in Neon (run db/seed.py first, it loads data/cities/*.yaml)")
        city_id, bbox = row

        if bbox and len(bbox) == 4:
            west, south, east, north = bbox
            outside = sum(1 for r in score_rows if not (west <= r[1] <= east and south <= r[2] <= north))
            if outside:
                print(f"warning: {outside} cell(s) fall outside the {slug} bbox; "
                      f"check the lat/lng columns are not swapped")

        cur.execute("DELETE FROM cell_scores WHERE city_id = %s", (city_id,))
        cur.executemany(
            f"""INSERT INTO cell_scores (city_id, h3_cell, centroid, expected_overflow,
                                        reports_per_1k, under_reported, demand)
                VALUES (%s, %s, {POINT}, %s, %s, %s, %s)""",
            [(city_id, r[0], r[1], r[2], r[3], r[4], r[5], r[6]) for r in score_rows],
        )

        cur.execute("DELETE FROM bins WHERE city_id = %s AND source <> 'proposed'", (city_id,))
        cur.executemany(
            f"INSERT INTO bins (city_id, geom, source) VALUES (%s, {POINT}, %s)",
            [(city_id, r[0], r[1], r[2]) for r in bin_rows],
        )

        cur.execute("DELETE FROM bin_candidates WHERE city_id = %s", (city_id,))
        cur.executemany(
            f"""INSERT INTO bin_candidates (city_id, geom, rank, gain, nearest_bin_m, nearby_reports)
                VALUES (%s, {POINT}, %s, %s, %s, %s)""",
            [(city_id, r[1], r[2], r[0], r[3], r[4], r[5]) for r in cand_rows],
        )
    # leaving the `with` block commits; any exception above rolled everything back

    under = sum(1 for r in score_rows if r[5])
    print(f"loaded {slug}: {len(score_rows)} cells ({under} under-reported), "
          f"{len(bin_rows)} bins, {len(cand_rows)} bin candidates")
    print("rationale is empty until you run data/explain.py")


main()
