// Removed server-side WASM embedding implementation to avoid native bindings on Vercel.
// The embedding endpoint should proxy to an external embedding service via
// EMBEDDING_SERVICE_URL. This file kept as a harmless stub to avoid accidental imports.

export async function embedQueryWasm(_: string): Promise<number[]> {
  throw new Error('Server-side WASM embedding removed. Configure EMBEDDING_SERVICE_URL and use /api/embedding-384.');
}

export default embedQueryWasm;
