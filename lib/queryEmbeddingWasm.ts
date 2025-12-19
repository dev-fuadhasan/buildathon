/**
 * WASM-based query embedding using @xenova/transformers
 * Safe to import: uses dynamic import for @xenova and sets TRANSFORMERS_BACKEND=wasm
 */

export async function embedQueryWasm(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) return [];

  // Force wasm backend before loading transformers
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    process.env.TRANSFORMERS_BACKEND = 'wasm';
  } catch (e) {
    // ignore if not writable
  }

  const transformers = await import('@xenova/transformers');

  const embedder = await transformers.pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2', ({ quantized: true, device: 'wasm' } as any));

  const out = await embedder(text);

  // Normalize output shapes and mean-pool token vectors
  let vec: number[] = [];
  if (Array.isArray(out) && out.length > 0) {
    if (typeof out[0] === 'number') {
      vec = out as number[];
    } else if (Array.isArray(out[0]) && typeof out[0][0] === 'number') {
      const seq = out as number[][];
      const hidden = seq[0].length;
      vec = new Array(hidden).fill(0);
      for (const token of seq) for (let i = 0; i < hidden; i++) vec[i] += token[i];
      for (let i = 0; i < hidden; i++) vec[i] = vec[i] / seq.length;
    } else if (Array.isArray(out[0]) && Array.isArray(out[0][0]) && typeof out[0][0][0] === 'number') {
      const batch = out as number[][][];
      const seq = batch[0];
      const hidden = seq[0].length;
      vec = new Array(hidden).fill(0);
      for (const token of seq) for (let i = 0; i < hidden; i++) vec[i] += token[i];
      for (let i = 0; i < hidden; i++) vec[i] = vec[i] / seq.length;
    } else {
      throw new Error('Unexpected embedding output shape');
    }
  } else {
    throw new Error('Empty embedding output');
  }

  // Ensure 384-dim (caller must verify schema)
  if (vec.length !== 384) {
    // If model returns different dim, throw
    throw new Error(`Unexpected embedding dimension: ${vec.length}`);
  }

  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  const normalized = norm > 0 ? vec.map(v => v / norm) : vec;

  return normalized;
}

export default embedQueryWasm;
