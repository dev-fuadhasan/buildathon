"use client";

/**
 * Client wrapper: Call server-side local embedding endpoint
 * POST /api/embedding-384
 */
interface EmbeddingResponse {
  success: boolean;
  embedding?: number[];
  error?: string;
}

export async function embedQuery(text: string): Promise<EmbeddingResponse> {
  if (typeof window === 'undefined') {
    throw new Error('embedQuery (client) must be called from browser code');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { success: false, error: 'Text must be a non-empty string' };
  }

  try {
    const res = await fetch('/api/embedding-384', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return { success: false, error: `Embedding endpoint error: ${res.status} ${txt}` };
    }

    const data = await res.json() as EmbeddingResponse;
    if (!data.embedding) return { success: false, error: data.error || 'No embedding returned' };

    // Normalize to unit vector
    const norm = Math.sqrt(data.embedding.reduce((s, v) => s + v * v, 0));
    const normalized = norm > 0 ? data.embedding.map(v => v / norm) : data.embedding;

    return { success: true, embedding: normalized };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export interface EmbeddingResult {
  embedding: number[];
}
