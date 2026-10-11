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
        "an overflowing trash bin with garbage bags and boxes piled around its base",
        "a full bin with trash bags on top and spilling onto the pavement",
        "an overflowing wheelie bin with its lid pushed open by rubbish",
        "a trash can stuffed with paper and litter",
        "a bin overflowing with rubbish bags on a city street",
        "a full litter bin with cups and wrappers piled on top",
        "a dumpster overflowing with trash and cardboard",
    ],
    "bag_pile": [
        "a photo of a pile of trash bags on a sidewalk",
        "several garbage bags stacked on top of each other outdoors",
        "a mound of trash bags left on the street or curb",
        "a heap of black rubbish bags on a pavement",
        "white and clear garbage bags piled against a wall",
        "bags of rubbish left on the street with no bin",
    ],
    "illegal_dumping": [
        "a photo of illegally dumped furniture and junk at a curb",
        "a pile of construction debris or old appliances abandoned outdoors",
        "a mattress or couch dumped on the side of the road",
        "a large heap of mixed garbage and plastic waste dumped on the ground",
        "scattered litter, bottles and plastic waste strewn across the ground",
        "a big pile of junk, furniture and bags dumped next to a dumpster",
        "furniture and household junk dumped on a grass verge",
        "litter and trash scattered across a hillside or ditch",
        "a heap of rubbish dumped in an empty lot",
    ],
    "clean": [
        "a photo of a public trash can with its lid closed and nothing around it",
        "an empty trash bin in a park that is not full",
        "a tidy litter basket or recycling bin on a clean sidewalk",
        "a row of closed wheelie bins standing neatly",
        "a single empty public trash can standing on a street corner",
        "a clean litter bin on a sidewalk with nothing around it",
        "a metal public waste bin with no garbage in it, in daylight",
        "a recycling and trash kiosk on a clean pavement",
        "closed wheelie bins lined up at the curb waiting for collection",
        "a single wheelie bin standing on a clean sidewalk",
        "a row of neat colored wheelie bins on a pavement",
        "public litter bins with no rubbish around them",
        "a garbage truck collecting bins on a clean street",
    ],
    # Kept to things that are clearly not a bin problem. Generic street-scene prompts
    # ("a city street", "a building or a car") were removed: clean bins sit in street
    # scenes, and those prompts pulled them into not_trash (data/eval.py, 119 photos).
    "not_trash": [
        "a photo of garden plants and a flower bed",
        "a bin full of garden clippings and leaves",
        "a photo of a person",
        "a photo of a landscape",
    ],
}
# Severity applies only to labels that show trash, so there is no "clean" level here
# (photos called clean/not_trash are pinned to 0 below). Each level averages a few
# phrasings, like the labels do.
SEVERITY_PROMPTS = {
    1: [
        "a few pieces of litter",
        "a small amount of litter on the ground",
        "a little bit of rubbish near a bin",
    ],
    2: [
        "a lot of trash spread over the ground",
        "a large amount of rubbish scattered around a bin",
        "plenty of litter and bags on the pavement",
    ],
    3: [
        "a huge heap of trash covering the area",
        "a massive pile of rubbish and bags blocking the pavement",
        "an enormous mound of garbage",
    ],
}
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
SEV_LEVELS, SEV_TEXT = embed_label_prompts(SEVERITY_PROMPTS)   # levels 1, 2, 3

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
    severity = 0 if label in ZERO_SEVERITY_LABELS else SEV_LEVELS[int(sev_p.argmax())]
    return {
        "label": label,
        "label_confidence": float(label_p[i]),
        "severity": severity,
        "embedding": img[0].tolist(),
    }
