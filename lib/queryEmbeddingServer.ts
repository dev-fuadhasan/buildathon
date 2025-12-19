/**
 * Server-side query embedding using @xenova/transformers
 * - Model: sentence-transformers/all-MiniLM-L6-v2 (384-dim)
 * - Loads once (singleton)
 * - Uses mean pooling and L2 normalization
 */

let _embedder: any = null;

async function loadEmbedder() {
  if (_embedder) return _embedder;
  // Dynamic import so this module is safe to import in client-side code paths
  const transformers = await import('@xenova/transformers');
  // Create a feature-extraction pipeline for sentence embeddings
  _embedder = await transformers.pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
  return _embedder;
}

export async function embedQuery(text: string): Promise<number[]> {
  console.log('🔢 Generating query embedding (384-dim)');

  if (!text || text.trim().length === 0) return [];

  const embedder = await loadEmbedder();
  const out = await embedder(text);

  // Normalize handling: possible shapes:
  // - [hidden]                      -> single vector
  // - [seq_len, hidden]             -> token vectors (mean pool)
  // - [[seq_len, hidden]]           -> batch shape

  let vec: number[] = [];

  if (Array.isArray(out) && out.length > 0) {
    // Case: [hidden]
    if (typeof out[0] === 'number') {
      vec = out as number[];
    }
    // Case: [seq_len, hidden]
    else if (Array.isArray(out[0]) && typeof out[0][0] === 'number') {
      const seq = out as number[][];
      const hidden = seq[0].length;
      vec = new Array(hidden).fill(0);
      for (const token of seq) for (let i = 0; i < hidden; i++) vec[i] += token[i];
      for (let i = 0; i < hidden; i++) vec[i] = vec[i] / seq.length;
    }
    // Case: [[seq_len, hidden]] (batch)
    else if (Array.isArray(out[0]) && Array.isArray(out[0][0]) && typeof out[0][0][0] === 'number') {
      const batch = out as number[][][];
      const seq = batch[0];
      const hidden = seq[0].length;
      vec = new Array(hidden).fill(0);
      for (const token of seq) for (let i = 0; i < hidden; i++) vec[i] += token[i];
      for (let i = 0; i < hidden; i++) vec[i] = vec[i] / seq.length;
    } else {
      throw new Error('Unexpected embedding output shape from transformer');
    }
  } else {
    throw new Error('Empty embedding output');
  }

  // L2-normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  const normalized = norm > 0 ? vec.map(v => v / norm) : vec;

  return normalized;
}

export default embedQuery;
