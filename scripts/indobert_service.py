"""
Service sentimen IndoBERT untuk SIMFONI.

Kenapa service terpisah, bukan nempel di proses Next.js:
- Model ~110 juta parameter, sekali load ke RAM tetap resident selama
  proses hidup -- jangan di-load ulang tiap request.
- Next.js (Node) tidak bisa langsung jalanin PyTorch; service ini jadi
  jembatan lewat HTTP, dipanggil dari lib/sentimentService.js.
- Dijalankan sebagai proses terpisah (systemd/pm2) supaya restart/crash
  di sisi Python tidak ikut menjatuhkan web app Next.js-nya.

Jalankan sekali di server:
    pip install fastapi uvicorn transformers torch --break-system-packages
    python3 scripts/indobert_service.py
Default listen di 127.0.0.1:8765 (localhost saja, tidak diekspos ke luar).

Model yang dipakai: taufiqdp/indonesian-sentiment (fine-tuned IndoBERT,
3 kelas: negatif/netral/positif, dilatih dari dataset IndoNLU + review
Bahasa Indonesia). Ganti MODEL_NAME kalau mau coba model lain.
"""

import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_NAME = os.environ.get("INDOBERT_MODEL", "taufiqdp/indonesian-sentiment")
PORT = int(os.environ.get("INDOBERT_PORT", "8765"))

app = FastAPI(title="SIMFONI IndoBERT Sentiment Service")

print(f"[indobert] loading model {MODEL_NAME} ...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
model.eval()
CLASS_NAMES = ["negatif", "netral", "positif"]
print("[indobert] model ready")


class SentimentRequest(BaseModel):
    texts: List[str]


class SentimentItem(BaseModel):
    label: str  # "Negatif" | "Netral" | "Positif" (format sama seperti analyzeSentiment lama)
    score: float  # confidence 0-1, buat threshold/logging kalau perlu


class SentimentResponse(BaseModel):
    results: List[SentimentItem]


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/sentiment", response_model=SentimentResponse)
def sentiment(req: SentimentRequest):
    # Batasi panjang teks biar konsisten & cepat -- judul+uraian panjang
    # dipotong ke 512 token (batas BERT), cukup buat tangkap sentimen inti.
    texts = [(t or "")[:2000] for t in req.texts]
    inputs = tokenizer(
        texts, return_tensors="pt", padding=True, truncation=True, max_length=256
    )
    with torch.inference_mode():
        logits = model(**inputs)["logits"]
        probs = torch.softmax(logits, dim=1)
    results = []
    for row in probs:
        idx = int(torch.argmax(row).item())
        label_raw = CLASS_NAMES[idx]
        label = label_raw.capitalize()  # "negatif" -> "Negatif", cocok sama format lama
        results.append(SentimentItem(label=label, score=float(row[idx].item())))
    return SentimentResponse(results=results)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=PORT)