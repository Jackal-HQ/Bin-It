import csv
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import requests
import yaml

DATA = Path(__file__).resolve().parent         # data/, regardless of where the script is run from

slug = sys.argv[1]
cfg = yaml.safe_load(open(DATA / "cities" / f"{slug}.yaml"))
out = DATA / "raw" / slug
out.mkdir(parents=True, exist_ok=True)
west, south, east, north = cfg["bbox"]
BOX = f"{south},{west},{north},{east}"          # Overpass order: south, west, north, east

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

def overpass(query, path):
    # overpass-api.de answers 406 to the default python-requests User-Agent; mirrors cover 504s when it's busy
    attempts = [(r, m) for r in range(3) for m in OVERPASS_MIRRORS]
    for i, (rnd, mirror) in enumerate(attempts):
        if rnd and mirror == OVERPASS_MIRRORS[0]:
            time.sleep(30 * rnd)
        try:
            res = requests.post(mirror, data={"data": query}, timeout=300,
                                headers={"User-Agent": "Bin-It/0.1 (hackathon; fetch_city.py)"})
            res.raise_for_status()
            break
        except requests.RequestException as e:
            print(f"overpass {mirror} failed: {e}")
            if i == len(attempts) - 1:
                raise
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["osm_id", "lat", "lng", "kind"])
        for e in res.json()["elements"]:
            lat = e.get("lat") or e.get("center", {}).get("lat")
            lng = e.get("lon") or e.get("center", {}).get("lon")
            tags = e.get("tags", {})
            kind = tags.get("amenity") or tags.get("leisure") or tags.get("highway") or tags.get("public_transport")
            if lat is not None:
                w.writerow([e["id"], lat, lng, kind])

overpass(f'[out:json][timeout:120]; nwr["amenity"="waste_basket"]({BOX}); out center;', out / "osm_bins.csv")
overpass(
    f'''[out:json][timeout:180];
    ( nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food)$"]({BOX});
      nwr["highway"="bus_stop"]({BOX});
      nwr["public_transport"="platform"]({BOX});
      nwr["leisure"="park"]({BOX}); );
    out center;''',
    out / "osm_places.csv",
)

c = cfg["complaints"]
if c["source"] == "socrata":
    type_field = c.get("type_field", "complaint_type")
    types = [t for group in c["category_map"].values() for t in group]
    quoted = ",".join("'" + t.replace("'", "''") + "'" for t in types)
    since = (date.today() - timedelta(days=3 * 365)).isoformat() + "T00:00:00"
    where = f"{c['date_field']} >= '{since}' AND {type_field} in ({quoted})"
    url = f"https://{c['domain']}/resource/{c['dataset_id']}.json"
    lat_f, lng_f = c["geo_fields"]
    with open(out / "complaints.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["created", "type", "lat", "lng"])
        offset = 0
        while True:
            res = requests.get(url, timeout=120, params={
                "$where": where, "$limit": 50000, "$offset": offset, "$order": ":id"})
            res.raise_for_status()
            rows = res.json()
            for r in rows:
                if lat_f in r and lng_f in r:
                    w.writerow([r[c["date_field"]], r[type_field], r[lat_f], r[lng_f]])
            if len(rows) < 50000:
                break
            offset += 50000
print("done:", out)