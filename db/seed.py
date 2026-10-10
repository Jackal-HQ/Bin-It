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
random.seed(7)

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
seeded_reports = 0
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

    # 3. demo reports around the Orlando center, in 8 clusters
    cur.execute("SELECT id, ST_Y(center::geometry), ST_X(center::geometry) FROM cities WHERE slug = 'orlando'")
    city_id, clat, clng = cur.fetchone()
    clusters = [(clat + random.uniform(-0.012, 0.012), clng + random.uniform(-0.012, 0.012)) for _ in range(8)]

    rows = list(csv.DictReader(open("data/test_photos/labels.csv")))
    total = len(rows)
    print(f"seeding {total} demo reports into 8 clusters around Orlando\n")

    for i, row in enumerate(rows):
        filename = row["filename"]
        path = f"data/test_photos/{filename}"
        k = i % len(clusters)
        lat = clusters[k][0] + random.uniform(-0.0002, 0.0002)   # about 20 m of spread
        lng = clusters[k][1] + random.uniform(-0.0002, 0.0002)

        # One photo must not abort the whole seed. On any failure, roll back
        # just this row's writes, record why, and move on.
        created_ticket_this_row = None
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

            ticket_id = f"tkt_seed{k}"
            new_ticket = ticket_id not in made
            if new_ticket:
                made.add(ticket_id)
                created_ticket_this_row = ticket_id
                cur.execute(
                    f"""INSERT INTO tickets (id, city_id, centroid, label, max_severity, report_count)
                        VALUES (%s, %s, {POINT}, %s, 0, 0)""",
                    (ticket_id, city_id, lng, lat, out["label"]),
                )
            cur.execute(
                f"""INSERT INTO reports (id, city_id, ticket_id, geom, photo_url, label, severity,
                                        embedding, device_id, is_synthetic)
                    VALUES (%s, %s, %s, {POINT}, %s, %s, %s, %s::vector, 'seed', true)""",
                (f"rpt_seed{i}", city_id, ticket_id, lng, lat, f"{BASE}/{key}", out["label"],
                 out["severity"], "[" + ",".join(str(x) for x in out["embedding"]) + "]"),
            )
            cur.execute(
                """UPDATE tickets SET report_count = report_count + 1,
                       max_severity = GREATEST(max_severity, %s), last_seen = now() WHERE id = %s""",
                (out["severity"], ticket_id),
            )
            # Commit the ticket + report together, per row, so a later failure
            # cannot discard earlier work and never leaves an empty ticket.
            conn.commit()
            seeded_reports += 1
            ticket_note = f"new ticket {ticket_id}" if new_ticket else f"merged into {ticket_id}"
            # overwrite the "processing" line with the result
            print(f"\r[{i + 1}/{total}] {filename} -> {out['label']} "
                  f"sev {out['severity']} ({ticket_note})" + " " * 10)
        except Exception as e:
            conn.rollback()
            # the ticket insert (if any) for this row was rolled back too,
            # so drop it from the created set.
            if created_ticket_this_row:
                made.discard(created_ticket_this_row)
            skipped.append((filename, repr(e)))
            print(f"\r[{i + 1}/{total}] {filename} -> SKIPPED: {e}" + " " * 10)


print(f"\ndone: seeded {seeded_reports} reports across {len(made)} tickets; "
      f"skipped {len(skipped)}")
if skipped:
    print("skipped files:")
    for fn, reason in skipped:
        print(f"  {fn}: {reason}")