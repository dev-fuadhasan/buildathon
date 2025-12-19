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
      // If an external embedding service is configured, proxy the request to it
      const serviceUrl = process.env.EMBEDDING_SERVICE_URL;
      if (!serviceUrl) {
        console.error('[Embedding-384] No EMBEDDING_SERVICE_URL configured');
        return NextResponse.json({ error: 'Embedding service not configured' }, { status: 501 });
      }

      const res = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EMBEDDING_SERVICE_KEY ? { Authorization: `Bearer ${process.env.EMBEDDING_SERVICE_KEY}` } : {}),
        },
        body: JSON.stringify({ text: body.text }),
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('[Embedding-384] External embedding service error:', res.status, txt);
        return NextResponse.json({ error: 'External embedding service error' }, { status: 502 });
      }

      const json = await res.json();
      const embedding = json.embedding || json.data?.embedding || null;
      if (!Array.isArray(embedding) || embedding.length !== 384) {
        console.error('[Embedding-384] Invalid embedding shape from external service');
        return NextResponse.json({ error: 'Invalid embedding from service' }, { status: 502 });
      }

      console.log('[VECTOR SEARCH] Query embedding generated (384-dim) via external service');
      return NextResponse.json({ embedding });
    } catch (err: any) {
      console.error('[Embedding-384] Proxy embedding error:', err && err.message ? err.message : err);
      return NextResponse.json({ error: 'Embedding proxy error' }, { status: 500 });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Embedding-384] Error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
