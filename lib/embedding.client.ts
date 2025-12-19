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

// Singleton pattern: load model once, reuse
let pipelinePromise: Promise<any> | null = null;
let modelLoaded = false;

/**
 * Lazy-load the embedding model (only once)
 * Uses dynamic import to avoid server-side inclusion
 */
async function getEmbeddingPipeline() {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    try {
      // Dynamically import only on client
      const { pipeline } = await import('@xenova/transformers');

      console.log('[Embedding] Loading Xenova/multilingual-e5-base model...');

      const extractor = await (pipeline as any)('feature-extraction', {
        model: 'Xenova/multilingual-e5-base',
        // Optional: customize settings
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            console.log(
              `[Embedding] Loading... ${Math.round((progress.progress || 0) * 100)}%`
            );
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
 * Generate embedding for a text string (with E5 prefix)
 * 
 * @param text - The text to embed
 * @param isQuery - If true, prefix with "query:" (for user questions). If false, prefix with "passage:" (for Q&A pairs)
 * @returns Embedding vector (768 dimensions)
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

    // Add E5 prefix based on usage type
    const prefix = isQuery ? 'query: ' : 'passage: ';
    const prefixedText = prefix + text;

    console.log('[Embedding] Generating embedding...');

    // Generate embedding with mean pooling and normalization
    const result = await pipeline(prefixedText, {
      pooling: 'mean',
      normalize: true,
    });

    // Extract vector from result
    // The pipeline returns a Tensor, convert to array
    const embedding = Array.from((result as any).data) as number[];

    console.log(
      `[Embedding] Generated embedding (${embedding.length} dimensions)`
    );

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
