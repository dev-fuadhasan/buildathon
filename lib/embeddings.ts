/**
 * Embedding Utilities for MomsCare
 * Handles loading and using Hugging Face Transformers models for generating embeddings
 */

// Check if we're in a serverless environment (where native bindings may not work)
const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME;

let embeddingPipeline: any = null;
let isModelLoading = false;
let modelLoadPromise: Promise<any> | null = null;
let embeddingsAvailable = false; // Track if embeddings can be used

/**
 * Initialize the embedding model
 * Downloads model on first call (cached afterwards)
 * In serverless environments, this may not work due to native bindings
 */
export async function initializeEmbeddingModel(): Promise<any> {
  // Check if embeddings are disabled in serverless
  if (isServerless) {
    console.warn('[Embeddings] Serverless environment detected - embeddings may not work due to native bindings');
    embeddingsAvailable = false;
    throw new Error('Embeddings not available in serverless environment');
  }

  // Return cached pipeline if available
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  // If model is already loading, wait for it
  if (isModelLoading && modelLoadPromise) {
    return modelLoadPromise;
  }

  // Start loading
  isModelLoading = true;
  console.log(`[Embeddings] Loading model: ${process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-base'}...`);
  console.log(`[Embeddings] This may take a few minutes on first run (downloading model)...`);

  try {
    // Dynamic import to avoid build-time errors in serverless
    const { pipeline } = await import('@xenova/transformers');
    
    modelLoadPromise = pipeline(
      'feature-extraction',
      process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-base',
      {
        // Quantized model for faster loading
        quantized: true,
      }
    ).then((pipeline) => {
      embeddingPipeline = pipeline;
      isModelLoading = false;
      embeddingsAvailable = true;
      console.log(`✅ [Embeddings] Model loaded successfully`);
      return pipeline;
    }).catch((error) => {
      isModelLoading = false;
      modelLoadPromise = null;
      embeddingsAvailable = false;
      console.error(`❌ [Embeddings] Failed to load model:`, error.message);
      throw error;
    });

    return modelLoadPromise;
  } catch (error: any) {
    isModelLoading = false;
    modelLoadPromise = null;
    embeddingsAvailable = false;
    console.error(`❌ [Embeddings] Failed to import transformers:`, error.message);
    throw error;
  }
}

/**
 * Check if embeddings are available
 */
export function areEmbeddingsAvailable(): boolean {
  return embeddingsAvailable && !isServerless && embeddingPipeline !== null;
}

/**
 * Generate embedding for a single text
 * @param text - Text to embed
 * @returns Embedding vector (array of numbers)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Check if available first
    if (isServerless || !embeddingsAvailable) {
      throw new Error('Embeddings not available in serverless environment');
    }

    // Ensure model is loaded
    const pipeline = await initializeEmbeddingModel();

    // For multilingual-e5-base, we need to add a prefix
    // "query: " for queries, "passage: " for documents
    const prefixedText = text.startsWith('query:') || text.startsWith('passage:') 
      ? text 
      : `passage: ${text}`;

    // Generate embedding
    const output = await pipeline(prefixedText, {
      pooling: 'mean', // Average pooling for sentence embeddings
      normalize: true, // Normalize vectors for cosine similarity
    });

    // Convert tensor to array
    const embedding = Array.from(output.data) as number[];

    return embedding;
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error);
    throw error;
  }
}

/**
 * Generate embedding for a query (optimized for search queries)
 * @param query - Search query text
 * @returns Embedding vector
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    // Check if available first
    if (isServerless || !embeddingsAvailable) {
      throw new Error('Embeddings not available in serverless environment');
    }

    const pipeline = await initializeEmbeddingModel();

    // Add "query: " prefix for better search results
    const prefixedQuery = query.startsWith('query:') 
      ? query 
      : `query: ${query}`;

    const output = await pipeline(prefixedQuery, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(output.data) as number[];
  } catch (error) {
    console.error('[Embeddings] Error generating query embedding:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 * @param texts - Array of texts to embed
 * @param batchSize - Number of texts to process at once (default: 10)
 * @returns Array of embedding vectors
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 10
): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  console.log(`[Embeddings] Generating embeddings for ${texts.length} texts (batch size: ${batchSize})...`);

  // Process in batches to avoid memory issues
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(text => generateEmbedding(text))
    );
    embeddings.push(...batchEmbeddings);

    // Progress logging
    if ((i + batchSize) % 50 === 0 || i + batchSize >= texts.length) {
      console.log(`[Embeddings] Progress: ${Math.min(i + batchSize, texts.length)}/${texts.length}...`);
    }
  }

  console.log(`✅ [Embeddings] Generated ${embeddings.length} embeddings`);
  return embeddings;
}

/**
 * Get embedding dimensions for the current model
 * @returns Number of dimensions
 */
export async function getEmbeddingDimensions(): Promise<number> {
  const testEmbedding = await generateEmbedding('test');
  return testEmbedding.length;
}

/**
 * Clear the cached model (useful for testing or switching models)
 */
export function clearEmbeddingCache(): void {
  embeddingPipeline = null;
  isModelLoading = false;
  modelLoadPromise = null;
  console.log('[Embeddings] Cache cleared');
}

