"""Pull a sample of images from the Akhila-9849/Garbage_Bin_overflow_images
Hugging Face dataset into data/test_photos/, and append rows to labels.csv
with `label` and `severity` left blank for a human to fill in by eye.

Despite the dataset's self-declared CC-BY-4.0 license, a 6-image spot check
found 2/6 were watermarked Alamy stock photos (one a CGI/staged image
unrelated to real trash, one a real photo of a crowd - a face-privacy risk)
mixed in alongside genuine photos. Do not bulk-trust this source: review
every image before adding it to the eval set - check for watermarks/stock
imagery, identifiable faces, and whether the single "overflow" label the
dataset implies actually matches what's in the photo (it was wrong on
roughly half of the reviewed sample).

Usage: python data/fetch_hf_test_photos.py [count]
"""
import csv
import sys
from pathlib import Path

import requests

DATASET = "Akhila-9849/Garbage_Bin_overflow_images"
ROWS_API = "https://datasets-server.huggingface.co/rows"
REPO_ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = REPO_ROOT / "data" / "test_photos"
LABELS_CSV = PHOTOS_DIR / "labels.csv"
SOURCE = f"https://huggingface.co/datasets/{DATASET} (CC-BY-4.0, credit Akhila-9849)"


def fetch_rows(offset, length):
    resp = requests.get(
        ROWS_API,
        params={"dataset": DATASET, "config": "default", "split": "train", "offset": offset, "length": length},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["rows"]


def main():
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 24
    rows = fetch_rows(0, count)

    existing_filenames = set()
    if LABELS_CSV.exists():
        with open(LABELS_CSV, newline="") as f:
            existing_filenames = {r["filename"] for r in csv.DictReader(f)}

    new_rows = []
    for i, row in enumerate(rows):
        src = row["row"]["image"]["src"]
        filename = f"hf_overflow_{i:03d}.jpg"
        if filename in existing_filenames:
            continue

        img_resp = requests.get(src, timeout=30)
        img_resp.raise_for_status()
        (PHOTOS_DIR / filename).write_bytes(img_resp.content)

        new_rows.append(
            {
                "filename": filename,
                "city": "",
                "label": "",
                "severity": "",
                "source": SOURCE,
                "notes": "UNREVIEWED from HF dataset - open it, check for watermarks/stock imagery and faces, "
                "then fill in label + severity yourself (don't trust the dataset's implied single class)",
            }
        )
        print(f"saved {filename}")

    if not new_rows:
        print("Nothing new to add.")
        return

    file_exists = LABELS_CSV.exists()
    with open(LABELS_CSV, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["filename", "city", "label", "severity", "source", "notes"])
        if not file_exists:
            writer.writeheader()
        writer.writerows(new_rows)

    print(f"\nAdded {len(new_rows)} photo(s) to {LABELS_CSV}, all UNREVIEWED.")
    print("Before running eval.py: open each one, drop any watermarked/stock/identifiable-face photos,")
    print("and fill in label + severity yourself for the rest - do not trust the dataset's implied label.")


if __name__ == "__main__":
    main()
