# scripts/embed_dataset.py
# =====================================================
# OFFLINE EMBEDDING SCRIPT (LOCAL, FREE, STABLE)
# =====================================================

import os
import json
import uuid
import pandas as pd
import torch
from tqdm import tqdm
from transformers import AutoTokenizer, AutoModel

# ================= CONFIG =================
MODEL_NAME = "intfloat/multilingual-e5-small"  # 384-dim

CSV_FILES = [
    r"D:\Buildathon\moms_care_dataset.csv",
    r"D:\Buildathon\moms_care_dataset_bangla.csv",
    r"D:\Buildathon\new_dataset.csv",
    r"D:\Buildathon\new_dataset_bn.csv",
]

OUTPUT_FILE = "embeddings_output.json"
# =========================================

print("\n🔄 Loading embedding model (one-time download ~120MB)...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)
model.eval()
print("✅ Model loaded")

# ---------- EMBEDDING FUNCTION ----------
def embed(text: str):
    text = "passage: " + text.strip()
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512
    )
    with torch.no_grad():
        vec = model(**inputs).last_hidden_state.mean(dim=1)
    vec = torch.nn.functional.normalize(vec, p=2, dim=1)
    return vec[0].tolist()  # 384 dims

# ---------- LOAD CSV ----------
print("\n📂 Loading CSV datasets...")
rows = []

for path in CSV_FILES:
    df = pd.read_csv(path)
    print(f"✅ Loaded {len(df)} rows from {path}")

    for _, r in df.iterrows():
        q = r.get("question") or r.get("Question") or r.get("প্রশ্ন")
        a = r.get("answer") or r.get("Answer") or r.get("উত্তর")

        if pd.isna(q) or pd.isna(a):
            continue

        rows.append({
            "question": str(q).strip(),
            "answer": str(a).strip(),
            "language": "bn" if "bangla" in path.lower() or "_bn." in path.lower() else "en",
            "severity": r.get("severity", "normal"),
            "trimester": r.get("trimester"),
            "category": r.get("category", "general"),
        })

print(f"\n🧮 Total valid Q&A rows: {len(rows)}")

# ---------- EMBEDDING ----------
records = []

print("\n🧠 Generating embeddings (local CPU)...")

for item in tqdm(rows):
    content = item["question"] + " " + item["answer"]
    embedding = embed(content)

    records.append({
        "qa_id": str(uuid.uuid4()),
        "question": item["question"],
        "answer": item["answer"],
        "content": content,
        "embedding": embedding,
        "language": item["language"],
        "severity": item["severity"],
        "trimester": int(item["trimester"]) if str(item["trimester"]).isdigit() else None,
        "category": item["category"],
        "source": "dataset",
        "keywords": []
    })

# ---------- SAVE ----------
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False)

size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)

print("\n" + "=" * 60)
print("✅ EMBEDDING COMPLETE")
print("=" * 60)
print(f"Records embedded: {len(records)}")
print(f"Embedding dim: 384")
print(f"File size: {size_mb:.1f} MB")
print(f"Output file: {OUTPUT_FILE}")
