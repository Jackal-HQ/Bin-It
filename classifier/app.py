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

LABELS = {
    "overflowing_can": "a photo of an overflowing public trash can with garbage spilling out",
    "bag_pile": "a photo of a pile of trash bags on a sidewalk",
    "illegal_dumping": "a photo of illegally dumped furniture and junk at a curb",
    "clean": "a photo of a clean street corner or an empty trash can",
    "not_trash": "a photo of something unrelated to trash",
}
SEVERITY = [
    "a clean street with no trash",
    "a trash can that is nearly full",
    "a trash can overflowing with litter around it",
    "a huge pile of trash covering the sidewalk",
]

def embed_text(prompts):
    inputs = proc(text=prompts, return_tensors="pt", padding=True)
    with torch.no_grad():
        feats = model.get_text_features(**inputs)
    return torch.nn.functional.normalize(feats, dim=-1)

LABEL_KEYS = list(LABELS)
LABEL_TEXT = embed_text(list(LABELS.values()))
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
    return {
        "label": LABEL_KEYS[i],
        "label_confidence": float(label_p[i]),
        "severity": int(sev_p.argmax()),
        "embedding": img[0].tolist(),
    }