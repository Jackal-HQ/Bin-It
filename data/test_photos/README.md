# Test photos

Hand-labeled photos used to sanity-check the classifier (`classifier/app.py`,
zero-shot CLIP — no training, so this set is for *evaluation*, not training).
Not committed to git except `labels.csv` and this file — the photos themselves
are gitignored (`data/test_photos/*` with `labels.csv`/`README.md` unignored).

## Privacy — read before adding a photo

Per `.claude/CLAUDE.md`: never add a photo where a passerby's face is
identifiable. These images sit at public URLs in the real app. If a photo
has a recognizable face, crop/blur it first or skip it.

## Adding a photo

1. Drop the image file in this folder. JPEG, longest side <= 1600px (match
   the app's own upload constraint). Name it something stable, e.g.
   `orlando_001.jpg`.
2. Add one row to `labels.csv` with your best-guess ground truth:

| column | value |
| --- | --- |
| `filename` | exact filename in this folder, e.g. `orlando_001.jpg` |
| `city` | city slug: `orlando`, `nyc`, or `chicago` |
| `label` | one of `overflowing_can`, `bag_pile`, `illegal_dumping`, `clean`, `not_trash` (the five labels `classifier/app.py` scores against) |
| `severity` | `0`-`3` (0 = clean, 3 = huge pile covering the sidewalk — see `SEVERITY` prompts in `classifier/app.py`) |
| `source` | where the photo came from (e.g. `self`, a stock/CC site + link, or `synthetic`) — keep licensing traceable |
| `notes` | anything odd about the shot (lighting, partial view, etc.) — optional |

Aim for a few examples per label, including some `clean`/`not_trash` shots
so the classifier isn't just tested on positives.

## Checking the classifier against these labels

Once you have a few rows in `labels.csv` and the classifier container is up
(locally or via the tunnel), run:

```powershell
python data/eval.py
```

It posts each photo to `$env:CLASSIFIER_URL/classify`, compares the
response to your `labels.csv` row, and prints per-label accuracy plus any
mismatches — so you can tell early if the zero-shot prompts need tuning
before Gate 1 close-out.
