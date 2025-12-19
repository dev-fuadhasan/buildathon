// Server-side embedding utilities have been disabled to avoid loading native
// model runtimes in serverless environments (Vercel). Use the /api/embedding-384
// endpoint (or an external embedding service) to obtain runtime query embeddings.

export function areEmbeddingsAvailable(): boolean {
  return false;
}

export async function generateEmbedding(_: string): Promise<number[]> {
  throw new Error('Server-side embedding disabled. Use /api/embedding-384 or an external embedding service.');
}

export async function generateQueryEmbedding(_: string): Promise<number[]> {
  throw new Error('Server-side query embedding disabled. Use /api/embedding-384 or an external embedding service.');
}

export async function generateEmbeddingsBatch(_: string[], __?: number): Promise<number[][]> {
  throw new Error('Server-side batch embedding disabled.');
}

export async function getEmbeddingDimensions(): Promise<number> {
  return 384;
}

export function clearEmbeddingCache(): void {}

