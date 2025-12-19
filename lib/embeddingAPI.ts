// Deprecated: Hugging Face Inference API usage removed.
// This module kept as a stub to avoid import errors in remaining code.

export async function generateQueryEmbeddingAPI(_: string): Promise<number[]> {
  throw new Error('HuggingFace embedding API removed. Use local embedding (scripts/query_embed.py) instead.');
}

export async function generateDocumentEmbeddingAPI(_: string): Promise<number[]> {
  throw new Error('HuggingFace embedding API removed. Use local embedding (scripts/query_embed.py) instead.');
}

export function isEmbeddingAPIConfigured(): boolean {
  return false;
}
