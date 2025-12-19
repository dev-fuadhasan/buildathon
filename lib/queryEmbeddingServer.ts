// Removed: runtime Xenova-based embedding. This file kept as a harmless stub
// to avoid accidental imports. DO NOT use runtime embeddings on Vercel.

export async function embedQuery(_: string): Promise<number[]> {
  throw new Error('Runtime embedding disabled. Use reference-embedding flow (Supabase) instead.');
}

export default embedQuery;
