/**
 * API ENDPOINT: 384-Dimensional Query Embedding (LOCAL)
 *
 * POST /api/embedding-384
 *
 * Generates embeddings locally by invoking the Python helper
 * `scripts/query_embed.py` which uses the same model as the dataset.
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { embedQueryWasm } from '@/lib/queryEmbeddingWasm';

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

    try {
      // Generate query embedding using WASM-backed Xenova transformer
      const embedding = await embedQueryWasm(body.text);
      console.log('[VECTOR SEARCH] Query embedding generated (384-dim)');
      return NextResponse.json({ embedding });
    } catch (err: any) {
      console.error('[Embedding-384] WASM embedding error:', err && err.message ? err.message : err);
      return NextResponse.json({ error: 'WASM embedding error' }, { status: 500 });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Embedding-384] Error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
