"""Write a one-sentence rationale for each recommended bin site and cache it in Neon.

Usage:
  python data/explain.py orlando            # one city
  python data/explain.py all                # every city that has bin_candidates
  python data/explain.py orlando --no-llm   # template sentences only (no HF call)
  python data/explain.py orlando --force    # rewrite rationales that already exist
                                            # (template sentences in the top N are upgraded without it)
  python data/explain.py orlando --top 10   # LLM only for the top N sites (default 20)

Run it after db/load_gold.py (which clears rationale). For each site it looks up the
H3 cell under it and builds a short fact list: the nearest existing bin, nearby reports,
and where the cell's expected overflow ranks within the city. The LLM only ever sees
those numbers, so it cannot invent facts. Sites outside the top N, and any site where
the LLM call fails, get a template sentence built from the same facts, so every row ends
up with a rationale.

Needs DATABASE_URL and (for the LLM) HF_TOKEN in .env.local. If port 5432 is blocked it
automatically uses Neon's HTTPS SQL endpoint (port 443) instead. Optional HF_MODEL picks the
chat model served by Hugging Face Inference Providers. The free HF credit is tiny, hence the top-N limit and the cache.
"""
import argparse
import os
import sys
from urllib.parse import urlparse

import psycopg
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

DEFAULT_MODEL = "meta-llama/Llama-3.1-8B-Instruct"   # listed by router.huggingface.co/v1/models; override with HF_MODEL
MAX_FAILURES = 3          # stop calling the LLM after this many failures in a row
MAX_LEN = 240

SQL = """
WITH ranked AS (
    SELECT centroid, under_reported, demand,
           percent_rank() OVER (ORDER BY expected_overflow) AS pr
    FROM cell_scores WHERE city_id = %s AND expected_overflow IS NOT NULL
)
SELECT c.id, c.rank, c.nearest_bin_m, c.nearby_reports, c.rationale,
       n.pr, n.under_reported
FROM bin_candidates c
LEFT JOIN LATERAL (
    SELECT r.pr, r.under_reported
    FROM ranked r
    WHERE ST_DWithin(r.centroid, c.geom, 400)
    ORDER BY r.centroid <-> c.geom
    LIMIT 1
) n ON true
WHERE c.city_id = %s
ORDER BY c.rank
"""


def fail(message):
    sys.exit(f"error: {message}")


class Db:
    """Neon access. Tries a normal connection (port 5432); if that port is blocked, falls
    back to Neon's SQL-over-HTTPS endpoint (port 443), which works on school wifi/hotspots."""

    def __init__(self, url):
        self.url = url
        self.conn = None
        try:
            self.conn = psycopg.connect(url, connect_timeout=8)
        except psycopg.OperationalError:
            host = urlparse(url).hostname
            self.endpoint = f"https://{host}/sql"
            print("note: port 5432 unreachable, using Neon's HTTPS SQL endpoint instead")

    def run(self, sql, params=()):
        """Execute one statement (use %s placeholders); returns rows as tuples."""
        if self.conn:
            with self.conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall() if cur.description else []
            self.conn.commit()
            return rows
        n = 0

        def number(_):
            nonlocal n
            n += 1
            return f"${n}"
        import re
        http_sql = re.sub(r"%s", number, sql)
        r = requests.post(
            self.endpoint,
            headers={"Neon-Connection-String": self.url, "Neon-Array-Mode": "true"},
            json={"query": http_sql, "params": list(params)},
            timeout=60,
        )
        if r.status_code != 200:
            fail(f"database request failed ({r.status_code}): {r.text[:300]}")
        return [tuple(row) for row in r.json().get("rows", [])]


def facts(row):
    """Plain-language facts for one site. Only states what the numbers support."""
    nearest_m, reports, pr, under = row[2], row[3], row[5], row[6]
    out = []
    if nearest_m is not None:
        out.append(f"the nearest existing bin is about {round(nearest_m / 10) * 10:.0f} m away")
    if reports:
        out.append(f"{reports} report{'s' if reports != 1 else ''} nearby")
    else:
        out.append("no resident reports nearby yet")
    if pr is not None:
        top = max(1, round((1 - pr) * 100))
        if top <= 50:
            out.append(f"estimated overflow is in the top {top}% of this city's cells")
    if under:
        out.append("the area looks under-reported compared with expected overflow")
    return out


def template(row):
    f = facts(row)
    return (f[0][0].upper() + f[0][1:] + ("; " + "; ".join(f[1:]) if len(f) > 1 else "") + ".")


def llm_sentence(client, model, row):
    prompt = (
        "You help city staff decide where to add a trash bin. Write ONE plain sentence "
        "(at most 30 words) explaining why this site was recommended. Use only the facts "
        "below. Do not add any other numbers, places or causes, and do not say the bin "
        "will definitely fix anything.\n\nFacts:\n" + "\n".join(f"- {x}" for x in facts(row))
    )
    resp = client.chat_completion(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=80,
        temperature=0.2,
    )
    text = (resp.choices[0].message.content or "").strip().splitlines()
    text = text[0].strip().strip('"') if text else ""
    if not text:
        raise ValueError("empty completion")
    return text[:MAX_LEN]


def explain_city(db, slug, client, model, top, force):
    found = db.run("SELECT id FROM cities WHERE slug = %s", (slug,))
    if not found:
        fail(f"no city {slug!r} in Neon")
    rows = db.run(SQL, (found[0][0], found[0][0]))
    if not rows:
        print(f"{slug}: no bin_candidates (run db/load_gold.py {slug} first)")
        return

    failures = 0
    llm_n = template_n = kept = 0
    updates = []
    for row in rows:
        cid, rank, old = row[0], row[1], row[4]
        # A cached template sentence is not final: upgrade it once the LLM is available.
        upgradable = client and rank is not None and rank <= top and old == template(row)
        if old and not force and not upgradable:
            kept += 1
            continue
        text = None
        if client and rank is not None and rank <= top and failures < MAX_FAILURES:
            try:
                text = llm_sentence(client, model, row)
                failures = 0
                llm_n += 1
            except Exception as e:   # network, auth, model unavailable, empty answer
                failures += 1
                print(f"  rank {rank}: LLM failed ({type(e).__name__}: {" ".join(str(e).split())[-200:]}), using template")
                if failures == MAX_FAILURES:
                    print("  too many LLM failures in a row; using templates for the rest")
        if text is None:
            text = template(row)
            template_n += 1
        updates.append((text, cid))

    for text, cid in updates:
        db.run("UPDATE bin_candidates SET rationale = %s WHERE id = %s", (text, cid))
    print(f"{slug}: {llm_n} written by LLM, {template_n} from template, {kept} kept (already set)")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("city", help="city slug, or 'all'")
    ap.add_argument("--no-llm", action="store_true", help="template sentences only")
    ap.add_argument("--force", action="store_true", help="overwrite existing rationales")
    ap.add_argument("--top", type=int, default=20, help="LLM only for ranks <= N (default 20)")
    args = ap.parse_args()

    client = model = None
    if not args.no_llm:
        token = os.environ.get("HF_TOKEN")
        if not token:
            print("note: HF_TOKEN not set, using template sentences only")
        else:
            from huggingface_hub import InferenceClient
            model = os.environ.get("HF_MODEL", DEFAULT_MODEL)
            client = InferenceClient(token=token, timeout=30)
            print(f"LLM: {model} for the top {args.top} sites per city")

    db = Db(os.environ["DATABASE_URL"])
    if args.city == "all":
        slugs = [r[0] for r in db.run("SELECT slug FROM cities ORDER BY slug")]
    else:
        slugs = [args.city]
    for slug in slugs:
        explain_city(db, slug, client, model, args.top, args.force)


if __name__ == "__main__":
    main()
