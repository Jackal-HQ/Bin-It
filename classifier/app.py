import io
import os
import torch
from fastapi import FastAPI, Header, HTTPException, UploadFile
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

MODEL_ID = "openai/clip-vit-base-patch32"   # 512-dim embeddings
KEY = os.environ.get("CLASSIFIER_KEY")
model = CLIPModel.from_pretrained(MODEL_ID).eval()
proc = CLIPProcessor.from_pretrained(MODEL_ID)

# Each label gets several prompt phrasings, averaged into one embedding
# (standard CLIP zero-shot trick) instead of one sentence per label - a
# single phrasing is too sensitive to exact wording and was missing real
# overflow, calling it "clean" (see data/eval.py mismatches).
LABEL_PROMPTS = {
    "overflowing_can": [
        "a photo of an overflowing public trash can with garbage spilling out",
        "a trash can heaped above its rim with litter on top",
        "a public waste bin so full that garbage is falling onto the ground around it",
    ],
    "bag_pile": [
        "a photo of a pile of trash bags on a sidewalk",
        "several garbage bags stacked on top of each other outdoors",
        "a mound of trash bags left on the street or curb",
    ],
    "illegal_dumping": [
        "a photo of illegally dumped furniture and junk at a curb",
        "a photo of loose trash or debris dumped on the ground away from any bin",
        "a pile of construction debris or household junk abandoned outdoors",
        "a landfill-like heap of mixed waste and litter dumped in an open area",
    ],
    "clean": [
        "a photo of a clean, empty street corner with no litter",
        "a tidy, nearly empty public trash can with no garbage around it",
        "a well-maintained sidewalk or street with no visible trash",
    ],
    "not_trash": [
        "a photo of something unrelated to trash, like people, buildings, or nature",
    ],
}
SEVERITY = [
    "a clean street with no trash",
    "a trash can that is nearly full",
    "a trash can overflowing with litter around it",
    "a huge pile of trash covering the sidewalk",
]
# Labels whose severity is pinned to 0 regardless of the severity prompts'
# own guess - label and severity are scored independently below, so without
# this a photo correctly called "clean" could still get a nonzero severity.
ZERO_SEVERITY_LABELS = {"clean", "not_trash"}

def embed_text(prompts):
    inputs = proc(text=prompts, return_tensors="pt", padding=True)
    with torch.no_grad():
        feats = model.get_text_features(**inputs)
    return torch.nn.functional.normalize(feats, dim=-1)

def embed_label_prompts(prompt_lists):
    """One averaged, re-normalized embedding per label, from multiple phrasings."""
    keys = list(prompt_lists)
    flat = [p for prompts in prompt_lists.values() for p in prompts]
    flat_emb = embed_text(flat)
    out = []
    idx = 0
    for prompts in prompt_lists.values():
        group = flat_emb[idx : idx + len(prompts)]
        out.append(torch.nn.functional.normalize(group.mean(dim=0), dim=-1))
        idx += len(prompts)
    return keys, torch.stack(out)

LABEL_KEYS, LABEL_TEXT = embed_label_prompts(LABEL_PROMPTS)
SEV_TEXT = embed_text(SEVERITY)

app = FastAPI()

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/classify")
async def classify(photo: UploadFile, x_classifier_key: str | None = Header(default=None)):
    if KEY and x_classifier_key != KEY:
        raise HTTPException(status_code=401, detail="bad key")
    image = Image.open(io.BytesIO(await photo.read())).convert("RGB")
    inputs = proc(images=image, return_tensors="pt")
    with torch.no_grad():
        img = torch.nn.functional.normalize(model.get_image_features(**inputs), dim=-1)
    label_p = (100 * img @ LABEL_TEXT.T).softmax(dim=-1)[0]
    sev_p = (100 * img @ SEV_TEXT.T).softmax(dim=-1)[0]
    i = int(label_p.argmax())
    label = LABEL_KEYS[i]
    severity = 0 if label in ZERO_SEVERITY_LABELS else int(sev_p.argmax())
    return {
        "label": label,
        "label_confidence": float(label_p[i]),
        "severity": severity,
        "embedding": img[0].tolist(),
    }
