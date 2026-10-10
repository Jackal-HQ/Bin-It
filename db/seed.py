import csv
import glob
import os
import random

import boto3
import psycopg
import requests
import yaml
from botocore.config import Config
from dotenv import load_dotenv

load_dotenv(".env.local")

BUCKET = os.environ["STORAGE_BUCKET"]
BASE = os.environ["PHOTO_BASE_URL"]
CLASSIFIER = os.environ["CLASSIFIER_URL"]
HEADERS = {"X-Classifier-Key": os.environ.get("CLASSIFIER_KEY", "")}
s3 = boto3.client(
    "s3",
    endpoint_url=os.environ["STORAGE_ENDPOINT"],
    aws_access_key_id=os.environ["STORAGE_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["STORAGE_SECRET_ACCESS_KEY"],
    config=Config(s3={"addressing_style": "path"}),
)
POINT = "ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography"

# Which photos seed which city. Orlando keeps every photo in 8 clusters (unchanged from the
# first version, same ids and same random sequence). NYC and Chicago each get every third photo,
# offset so they do not share one, in 6 clusters. A photo is uploaded and classified once and
# its result reused for every city it appears in. `tag` goes into ticket/report ids; all of
# them start with tkt_seed / rpt_seed, which is what the cleanup below and reset_demo.sql match.
PLAN = [
    {"slug": "orlando", "tag": "", "clusters": 8, "step": 1, "offset": 0},
    {"slug": "nyc", "tag": "nyc", "clusters": 6, "step": 3, "offset": 1},
    {"slug": "chicago", "tag": "chicago", "clusters": 6, "step": 3, "offset": 2},
]
for plan in PLAN:
    plan["rng"] = random.Random(7 if plan["slug"] == "orlando" else f"seed-{plan['slug']}")

# MIME type per file extension, so .webp/.jpg/.avif are stored and sent
# honestly instead of all being mislabeled image/jpeg.
CONTENT_TYPES = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif",
}


def content_type_for(filename):
    _, ext = os.path.splitext(filename.lower())
    return CONTENT_TYPES.get(ext, "application/octet-stream")


made = set()        # ticket ids created this run
seeded_by_city = {p["slug"]: 0 for p in PLAN}
skipped = []        # (filename, reason) for photos that failed

with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
    print("connected to database")

    # 1. cities from the config files (bbox must be four numbers)
    city_files = sorted(glob.glob("data/cities/*.yaml"))
    for path in city_files:
        c = yaml.safe_load(open(path))
        cur.execute(
            f"""INSERT INTO cities (slug, name, center, bbox)
                VALUES (%s, %s, {POINT}, %s)
                ON CONFLICT (slug) DO UPDATE
                SET name = EXCLUDED.name, center = EXCLUDED.center, bbox = EXCLUDED.bbox""",
            (c["slug"], c["name"], c["center"]["lng"], c["center"]["lat"], c["bbox"]),
        )
    print(f"loaded {len(city_files)} cities: {', '.join(yaml.safe_load(open(p))['slug'] for p in city_files)}")

    # 2. clear earlier seed rows so the script can be rerun
    print("clearing previous seed rows...")
    cur.execute("DELETE FROM reports WHERE device_id = 'seed'")
    cur.execute("DELETE FROM tickets WHERE id LIKE 'tkt_seed%'")

    # Commit cities + cleanup so they survive even if photos below fail.
    conn.commit()

    # 3. demo reports around each city's center, in clusters
    for plan in PLAN:
        cur.execute("SELECT id, ST_Y(center::geometry), ST_X(center::geometry) FROM cities WHERE slug = %s",
                    (plan["slug"],))
        row = cur.fetchone()
        if not row:
            raise SystemExit(f"city {plan['slug']!r} is not in Neon: is data/cities/{plan['slug']}.yaml present?")
        plan["city_id"], clat, clng = row
        rng = plan["rng"]
        plan["clusters_xy"] = [
            (clat + rng.uniform(-0.012, 0.012), clng + rng.uniform(-0.012, 0.012))
            for _ in range(plan["clusters"])
        ]

    rows = list(csv.DictReader(open("data/test_photos/labels.csv")))
    total = len(rows)
    print("seeding demo reports: " + ", ".join(
        f"{p['slug']} {len([i for i in range(total) if i % p['step'] == p['offset']])} in {p['clusters']} clusters"
        for p in PLAN) + "\n")

    for i, row in enumerate(rows):
        filename = row["filename"]
        path = f"data/test_photos/{filename}"

        # Where this photo lands in each city that uses it. Jitter is drawn up front so the
        # random sequence does not depend on whether a photo later fails.
        places = []
        for plan in PLAN:
            if i % plan["step"] != plan["offset"]:
                continue
            j = i // plan["step"]                      # index among this city's photos
            k = j % plan["clusters"]
            lat = plan["clusters_xy"][k][0] + plan["rng"].uniform(-0.0002, 0.0002)   # about 20 m
            lng = plan["clusters_xy"][k][1] + plan["rng"].uniform(-0.0002, 0.0002)
            places.append((plan, k, lat, lng))

        # One photo must not abort the whole seed. On any failure, roll back
        # just this row's writes, record why, and move on.
        created_this_row = []
        # \r keeps a live "processing" line; flush so it shows immediately.
        print(f"[{i + 1}/{total}] {filename} -> uploading + classifying...",
              end="", flush=True)
        try:
            with open(path, "rb") as f:
                body = f.read()
            ctype = content_type_for(filename)
            key = f"seed/{filename}"
            s3.put_object(Bucket=BUCKET, Key=key, Body=body, ContentType=ctype)
            res = requests.post(f"{CLASSIFIER}/classify",
                                files={"photo": (filename, body, ctype)},
                                headers=HEADERS, timeout=60)
            res.raise_for_status()
            out = res.json()
            embedding = "[" + ",".join(str(x) for x in out["embedding"]) + "]"

            notes = []
            row_cities = []
            for plan, k, lat, lng in places:
                ticket_id = f"tkt_seed{plan['tag']}{k}"
                new_ticket = ticket_id not in made
                if new_ticket:
                    made.add(ticket_id)
                    created_this_row.append(ticket_id)
                    cur.execute(
                        f"""INSERT INTO tickets (id, city_id, centroid, label, max_severity, report_count)
                            VALUES (%s, %s, {POINT}, %s, 0, 0)""",
                        (ticket_id, plan["city_id"], lng, lat, out["label"]),
                    )
                cur.execute(
                    f"""INSERT INTO reports (id, city_id, ticket_id, geom, photo_url, label, severity,
                                            embedding, device_id, is_synthetic)
                        VALUES (%s, %s, %s, {POINT}, %s, %s, %s, %s::vector, 'seed', true)""",
                    (f"rpt_seed{plan['tag']}{i}", plan["city_id"], ticket_id, lng, lat, f"{BASE}/{key}",
                     out["label"], out["severity"], embedding),
                )
                cur.execute(
                    """UPDATE tickets SET report_count = report_count + 1,
                           max_severity = GREATEST(max_severity, %s), last_seen = now() WHERE id = %s""",
                    (out["severity"], ticket_id),
                )
                row_cities.append(plan["slug"])
                notes.append(f"{plan['slug']}: " + (f"new ticket {ticket_id}" if new_ticket
                                                    else f"merged into {ticket_id}"))
            # Commit the tickets + reports of this photo together, so a later failure
            # cannot discard earlier work and never leaves an empty ticket.
            conn.commit()
            for slug in row_cities:
                seeded_by_city[slug] += 1
            # overwrite the "processing" line with the result
            print(f"\r[{i + 1}/{total}] {filename} -> {out['label']} "
                  f"sev {out['severity']} ({'; '.join(notes)})" + " " * 10)
        except Exception as e:
            conn.rollback()
            # this row's ticket inserts were rolled back too, so drop them from the created set.
            for t in created_this_row:
                made.discard(t)
            skipped.append((filename, repr(e)))
            print(f"\r[{i + 1}/{total}] {filename} -> SKIPPED: {e}" + " " * 10)


for plan in PLAN:
    tickets = len([t for t in made if t.startswith(f"tkt_seed{plan['tag']}") and
                   (plan["tag"] or t[len("tkt_seed"):].isdigit())])
    print(f"{plan['slug']}: {seeded_by_city[plan['slug']]} reports across {tickets} tickets")
print(f"\ndone: {sum(seeded_by_city.values())} reports across {len(made)} tickets; "
      f"skipped {len(skipped)}")
if skipped:
    print("skipped files:")
    for fn, reason in skipped:
        print(f"  {fn}: {reason}")
