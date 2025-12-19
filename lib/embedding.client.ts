/**
 * CLIENT-SIDE BROWSER EMBEDDINGS
 * 
 * Uses Xenova/multilingual-e5-base with WebAssembly
 * - No Hugging Face API calls
 * - No server-side code needed
 * - Works offline after first load
 * - Safe for healthcare data (everything stays in browser)
 * 
 * This file MUST only be imported on the client side
 * Add 'use client' at the top of components that use this
 */

"use client";

// Singleton pattern: load model once, reuse
let pipelinePromise: Promise<any> | null = null;
let modelLoaded = false;
let pipelineProgress: number = 0;

/**
 * Lazy-load the embedding model (only once)
 * Uses dynamic import to avoid server-side inclusion
 */
export async function getEmbeddingPipeline() {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    try {
      // Dynamically import only on client. Be defensive: some bundlers/module shapes
      // expose the library as a default export or as named exports, so handle both.
      const mod = await import('@xenova/transformers');

      // Some bundlers/types expose different shapes; cast to `any` to safely access `.default`
      const m: any = mod as any;

      // Try multiple locations for the pipeline function
      const pipelineFn = (m && (m.pipeline ?? (m.default && m.default.pipeline))) as any;

      if (!pipelineFn) {
        console.error('[Embedding] @xenova/transformers did not expose `pipeline`');
        throw new Error('transformers pipeline not available');
      }

      console.log('[Embedding] Loading Xenova/all-MiniLM-L6-v2 model (WASM)...');

      const extractor = await pipelineFn('feature-extraction', {
        model: 'Xenova/all-MiniLM-L6-v2',
        progress_callback: (progress: any) => {
          try {
            // Log raw progress object for diagnostics
            console.log('[Embedding] progress callback raw:', progress);

            // Common shapes: { status: 'progress', progress: 0.12 }
            if (progress && typeof progress === 'object') {
              let pct: number | null = null;

              if (typeof progress.progress === 'number') {
                pct = Math.round(progress.progress * 100);
              } else if (typeof progress.loaded === 'number' && typeof progress.total === 'number' && progress.total > 0) {
                pct = Math.round((progress.loaded / progress.total) * 100);
              } else if (typeof progress.percent === 'number') {
                pct = Math.round(progress.percent);
              } else if (progress.detail && typeof progress.detail === 'object') {
                // some runtimes nest progress
                const d = progress.detail as any;
                if (typeof d.progress === 'number') pct = Math.round(d.progress * 100);
                else if (typeof d.loaded === 'number' && typeof d.total === 'number' && d.total > 0) pct = Math.round((d.loaded / d.total) * 100);
              }

              if (pct !== null) {
                pipelineProgress = Math.min(100, Math.max(0, pct));
                console.log(`[Embedding] Loading... ${pipelineProgress}%`);
              } else {
                // If we couldn't compute percent, leave pipelineProgress unchanged but log
                console.log('[Embedding] progress object provided but percent not available yet');
              }
            }
          } catch (err) {
            console.warn('[Embedding] progress callback error:', err);
          }
        },
      });

      modelLoaded = true;
      console.log('[Embedding] Model loaded successfully ✓');
      return extractor;
    } catch (error) {
      console.error('[Embedding] Failed to load model:', error);
      modelLoaded = false;
      pipelinePromise = null;
      throw error;
    }
  })();

  return pipelinePromise;
}

/**
 * Calculate cosine similarity between two embeddings
 * Range: -1 to 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding vectors must have same dimension');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Normalize embedding vector to unit length
 * Improves stability for cosine similarity calculations
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return embedding;
  return embedding.map(val => val / norm);
}

/**
 * Generate embedding for a text string
 * 
 * @param text - The text to embed
 * @param isQuery - If true, prefix with "query:" (for user questions). If false, prefix with "passage:" (for Q&A pairs)
 * @returns Embedding vector (expected 384 dimensions)
 * 
 * Example:
 *   const userQueryEmbedding = await embedText("মাথাব্যথা কি বিপজ্জনক?", true)
 *   const qaEmbedding = await embedText("মাথাব্যথা: গর্ভাবস্থায় এটি সাধারণ", false)
 */
export async function embedText(
  text: string,
  isQuery: boolean = true
): Promise<number[]> {
  if (!text || typeof text !== 'string') {
    throw new Error('Text must be a non-empty string');
  }

  try {
    const pipeline = await getEmbeddingPipeline();

    // Model expects plain text; for consistency we keep a light prefix
    const prefix = isQuery ? 'query: ' : 'passage: ';
    const inputText = prefix + text;

    console.log('[Embedding] Generating embedding...');

    // Generate embedding with mean pooling and normalization
    const embedPromise = pipeline(inputText, {
      pooling: 'mean',
      normalize: true,
    });

    // Enforce 4s timeout for embedding generation
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Embedding generation timed out (4s)')), 4000)
    );

    const result = await Promise.race([embedPromise, timeoutPromise]);

    // Extract vector from result
    const embedding = Array.from((result as any).data) as number[];

    console.log(`[Embedding] Generated embedding (${embedding.length} dimensions)`);

    // Verify dimension (expect 384 for all-MiniLM-L6-v2)
    if (embedding.length !== 384) {
      console.warn('[Embedding] Unexpected embedding dimension:', embedding.length);
    }

    return embedding;
  } catch (error) {
    console.error('[Embedding] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Batch embed multiple texts (more efficient than individual calls)
 * 
 * @param texts - Array of texts to embed
 * @param isQuery - Whether these are query texts or passage texts
 * @returns Array of embeddings
 */
export async function embedTextBatch(
  texts: string[],
  isQuery: boolean = false
): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Texts must be a non-empty array');
  }

  try {
    const pipeline = await getEmbeddingPipeline();

    const prefix = isQuery ? 'query: ' : 'passage: ';
    const prefixedTexts = texts.map(text => prefix + text);

    console.log(`[Embedding] Batch generating ${texts.length} embeddings...`);

    // Process all texts at once
    const results = await pipeline(prefixedTexts, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert results to array of embeddings
    const embeddings = prefixedTexts.map((_, index) => {
      const result = (results as any)[index];
      return Array.from((result as any).data) as number[];
    });

    console.log(`[Embedding] Generated ${embeddings.length} embeddings`);

    return embeddings;
  } catch (error) {
    console.error('[Embedding] Error in batch embedding:', error);
    throw error;
  }
}

/**
 * Find top K most similar items from a list of reference embeddings
 * 
 * @param queryEmbedding - The query embedding vector
 * @param referenceEmbeddings - Array of reference embeddings to search
 * @param k - Number of top results to return
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Array of {index, similarity} sorted by similarity (highest first)
 */
export function searchSimilar(
  queryEmbedding: number[],
  referenceEmbeddings: number[][],
  k: number = 3,
  minSimilarity: number = 0.3
) {
  const results = referenceEmbeddings
    .map((refEmbedding, index) => ({
      index,
      similarity: cosineSimilarity(queryEmbedding, refEmbedding),
    }))
    .filter(result => result.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return results;
}

/**
 * Get model loading status
 * Useful for displaying loading UI
 */
export function isModelLoaded(): boolean {
  return modelLoaded;
}

/**
 * Get current model loading progress (0-100).
 * This is a polling-friendly synchronous getter used by `useEmbedding`.
 */
export function getModelProgress(): number {
  return pipelineProgress;
}

/**
 * Get pipeline loading promise (for waiting on model load)
 * Useful in useEffect hooks
 */
export function getModelLoadingPromise(): Promise<any> | null {
  return pipelinePromise;
}

/**
 * Reset the model (useful for memory cleanup if needed)
 * Note: This will require reloading the model on next use
 */
export function resetModel(): void {
  pipelinePromise = null;
  modelLoaded = false;
  console.log('[Embedding] Model reset');
}

/**
 * Simplified batch search: embed queries and find matches
 * 
 * @param queries - Array of query texts
 * @param qaDatabase - Array of {id, question, answer, embedding} objects
 * @param k - Top K results per query
 * @returns Array of search results
 */
export async function searchQADatabase(
  queries: string[],
  qaDatabase: Array<{ id: string; embedding: number[] }>,
  k: number = 3
) {
  try {
    const queryEmbeddings = await embedTextBatch(queries, true);

    return queryEmbeddings.map((queryEmbed, queryIndex) => {
      const topMatches = searchSimilar(queryEmbed, qaDatabase.map(qa => qa.embedding), k);
      return {
        query: queries[queryIndex],
        matches: topMatches.map(match => ({
          ...qaDatabase[match.index],
          similarity: match.similarity,
        })),
      };
    });
  } catch (error) {
    console.error('[Embedding] Error searching QA database:', error);
    throw error;
  }
}
