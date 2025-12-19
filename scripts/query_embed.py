#!/usr/bin/env python
"""
Simple CLI to embed a query using the same model as `embed_dataset.py`.
Reads text from argv or stdin, outputs JSON: {"embedding": [..]}

Requires: transformers, torch, numpy

Usage:
  python scripts/query_embed.py "your query here"
  echo "your query" | python scripts/query_embed.py
"""
import sys
import json
from transformers import AutoTokenizer, AutoModel
import torch

MODEL_NAME = "intfloat/multilingual-e5-small"


def embed_text(text: str):
    text = text.strip()
    if not text:
        return None

    prefixed = f"query: {text}"
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModel.from_pretrained(MODEL_NAME)
    model.eval()

    inputs = tokenizer(prefixed, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        out = model(**inputs).last_hidden_state.mean(dim=1)

    # L2 normalize
    vec = torch.nn.functional.normalize(out, p=2, dim=1)
    arr = vec[0].tolist()
    return arr


def main():
    if len(sys.argv) > 1:
        text = " ".join(sys.argv[1:])
    else:
        text = sys.stdin.read()

    embedding = embed_text(text)
    if embedding is None:
        print(json.dumps({"error": "empty input"}))
        sys.exit(1)

    print(json.dumps({"embedding": embedding}))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(2)
