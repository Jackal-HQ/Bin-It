"""Check the classifier's predictions against data/test_photos/labels.csv.

Usage: python data/eval.py
Reads CLASSIFIER_URL / CLASSIFIER_KEY from .env.local (repo root).
"""
import csv
import os
import sys
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = REPO_ROOT / "data" / "test_photos"
LABELS_CSV = PHOTOS_DIR / "labels.csv"


def load_env_local(path=REPO_ROOT / ".env.local"):
    env = {}
    if not path.exists():
        return env
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip().strip('"')
    return env


def main():
    env = load_env_local()
    classifier_url = os.environ.get("CLASSIFIER_URL") or env.get("CLASSIFIER_URL")
    classifier_key = os.environ.get("CLASSIFIER_KEY") or env.get("CLASSIFIER_KEY")

    if not classifier_url:
        print("CLASSIFIER_URL not set (check .env.local or the tunnel) — nothing to test against.")
        sys.exit(1)

    with open(LABELS_CSV, newline="") as f:
        rows = list(csv.DictReader(f))

    if not rows:
        print(f"{LABELS_CSV} has no rows yet. Add photos + labels first (see data/test_photos/README.md).")
        return

    total = 0
    label_correct = 0
    severity_exact = 0
    severity_within_1 = 0
    mismatches = []

    headers = {"X-Classifier-Key": classifier_key} if classifier_key else {}

    for row in rows:
        filename = row["filename"]
        photo_path = PHOTOS_DIR / filename
        if not photo_path.exists():
            print(f"skip {filename}: file not found in {PHOTOS_DIR}")
            continue

        with open(photo_path, "rb") as photo:
            try:
                resp = requests.post(
                    f"{classifier_url}/classify",
                    files={"photo": (filename, photo, "image/jpeg")},
                    headers=headers,
                    timeout=30,
                )
                resp.raise_for_status()
            except requests.RequestException as e:
                print(f"skip {filename}: request failed ({e})")
                continue

        predicted = resp.json()
        total += 1

        expected_label = row["label"]
        expected_severity = int(row["severity"])
        pred_label = predicted["label"]
        pred_severity = predicted["severity"]

        if pred_label == expected_label:
            label_correct += 1
        diff = abs(pred_severity - expected_severity)
        if diff == 0:
            severity_exact += 1
        if diff <= 1:
            severity_within_1 += 1

        if pred_label != expected_label or diff > 1:
            mismatches.append(
                f"  {filename}: expected label={expected_label} severity={expected_severity}, "
                f"got label={pred_label} ({predicted['label_confidence']:.2f}) severity={pred_severity}"
            )

    if total == 0:
        print("No photos could be evaluated (all skipped — see messages above).")
        return

    print(f"\nEvaluated {total} photo(s) against {classifier_url}")
    print(f"  label accuracy:       {label_correct}/{total} ({100 * label_correct / total:.0f}%)")
    print(f"  severity exact match: {severity_exact}/{total} ({100 * severity_exact / total:.0f}%)")
    print(f"  severity within ±1:   {severity_within_1}/{total} ({100 * severity_within_1 / total:.0f}%)")

    if mismatches:
        print(f"\nMismatches ({len(mismatches)}):")
        print("\n".join(mismatches))


if __name__ == "__main__":
    main()
