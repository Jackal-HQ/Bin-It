import csv
import glob
import os
import random

import boto3
import psycopg
import requests
import yaml
from botocore.config import Config

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

with psycopg.connect(os.environ["DATABASE_URL"]) as conn, conn.cursor() as cur:
    # 1. cities from the config files (bbox must be four numbers)
    for path in sorted(glob.glob("data/cities/*.yaml")):
        c = yaml.safe_load(open(path))
        cur.execute(
            f"""INSERT INTO cities (slug, name, center, bbox)
                VALUES (%s, %s, {POINT}, %s)
                ON CONFLICT (slug) DO UPDATE
                SET name = EXCLUDED.name, center = EXCLUDED.center, bbox = EXCLUDED.bbox""",
            (c["slug"], c["name"], c["center"]["lng"], c["center"]["lat"], c["bbox"]),
        )

    # 2. clear earlier seed rows so the script can be rerun
    cur.execute("DELETE FROM reports WHERE device_id = 'seed'")
    cur.execute("DELETE FROM tickets WHERE id LIKE 'tkt_seed%'")

    # 3. demo reports around the Orlando center, in 8 clusters
    cur.execute("SELECT id, ST_Y(center::geometry), ST_X(center::geometry) FROM cities WHERE slug = 'orlando'")
    city_id, clat, clng = cur.fetchone()
    clusters = [(clat + random.uniform(-0.012, 0.012), clng + random.uniform(-0.012, 0.012)) for _ in range(8)]
    made = set()
    for i, row in enumerate(csv.DictReader(open("data/test_photos/labels.csv"))):
        k = i % len(clusters)
        lat = clusters[k][0] + random.uniform(-0.0002, 0.0002)   # about 20 m of spread
        lng = clusters[k][1] + random.uniform(-0.0002, 0.0002)
        body = open(f"data/test_photos/{row['filename']}", "rb").read()
        key = f"seed/{row['filename']}"
        s3.put_object(Bucket=BUCKET, Key=key, Body=body, ContentType="image/jpeg")
        res = requests.post(f"{CLASSIFIER}/classify",
                            files={"photo": (row["filename"], body, "image/jpeg")},
                            headers=HEADERS, timeout=60)
        res.raise_for_status()
        out = res.json()
        ticket_id = f"tkt_seed{k}"
        if ticket_id not in made:
            made.add(ticket_id)
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
print("seeded", len(made), "tickets")