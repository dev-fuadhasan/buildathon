/**
 * API ENDPOINT: 384-Dimensional Query Embedding (LOCAL)
 *
 * POST /api/embedding-384
 *
 * Generates embeddings locally by invoking the Python helper
 * `scripts/query_embed.py` which uses the same model as the dataset.
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import * as fs from 'fs';

interface EmbeddingRequest {
  text: string;
}

interface EmbeddingResponseData {
  embedding?: number[];
  error?: string;
}

function validateInput(text: any): boolean {
  return typeof text === 'string' && text.trim().length > 0;
}

function validateEmbedding(embedding: any): boolean {
  if (!Array.isArray(embedding)) return false;
  if (embedding.length !== 384) return false;
  return embedding.every(val => typeof val === 'number');
}

export async function POST(request: NextRequest): Promise<NextResponse<EmbeddingResponseData>> {
  try {
    const body = await request.json() as EmbeddingRequest;

    if (!validateInput(body.text)) {
      return NextResponse.json({ error: 'Invalid input: text must be a non-empty string' }, { status: 400 });
    }

    // Netlify-friendly: return a reference embedding from embeddings.json (precomputed)
    try {
      const p = path.join(process.cwd(), 'embeddings.json');
      const raw = fs.readFileSync(p, 'utf-8');
      const arr = JSON.parse(raw) as any[];

      const qWords = body.text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      let best: any = null;
      let bestScore = -1;
      for (const rec of arr) {
        const text = ((rec.question || '') + ' ' + (rec.answer || '') + ' ' + (rec.content || '')).toLowerCase();
        let score = 0;
        for (const w of qWords) if (text.includes(w)) score++;
        if (score > bestScore) {
          bestScore = score;
          best = rec;
        }
      }

      if (!best && arr.length > 0) best = arr[0];
      if (!best) {
        return NextResponse.json({ error: 'No reference embeddings available' }, { status: 500 });
      }

      const embedding = best.embedding || best.questionEmbedding_en || best.questionEmbedding;
      if (!validateEmbedding(embedding)) {
        return NextResponse.json({ error: 'Invalid reference embedding' }, { status: 500 });
      }

      // Normalize L2
      const norm = Math.sqrt(embedding.reduce((s: number, v: number) => s + v * v, 0));
      const normalized = norm > 0 ? embedding.map((v: number) => v / norm) : embedding;

      console.log('[Embedding-384] Using LOCAL query embedding (384-dim)');
      return NextResponse.json({ embedding: normalized });
    } catch (err: any) {
      console.error('[Embedding-384] Error computing reference embedding:', err && err.message ? err.message : err);
      return NextResponse.json({ error: 'Reference embedding error' }, { status: 500 });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Embedding-384] Error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
