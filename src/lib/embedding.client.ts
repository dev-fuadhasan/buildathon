/**
 * Client-Side Embedding Utility
 * 
 * Browser-only embeddings using Xenova/multilingual-e5-base
 * - Runs entirely in the browser (no API calls)
 * - Uses WebAssembly (WASM) for performance
 * - Works offline after first load
 * - Safe for healthcare data (no data leaves the browser)
 * 
 * Requirements:
 * - DO NOT use in server-side code
 * - DO NOT use Hugging Face Inference API
 * - Embeddings run in browser only
 */

import { pipeline } from '@xenova/transformers';

// Model configuration
const MODEL_NAME = 'Xenova/multilingual-e5-base';
const MODEL_TASK = 'feature-extraction';

// Type for the feature extraction pipeline
type FeatureExtractionPipeline = Awaited<ReturnType<typeof pipeline>>;

// Singleton pattern: Load model once, reuse across all calls
let embeddingPipeline: FeatureExtractionPipeline | null = null;
let loadingPromise: Promise<FeatureExtractionPipeline> | null = null;
let loadingState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';

/**
 * Check if code is running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Initialize and load the embedding model
 * Uses lazy loading - model is only loaded when first needed
 * 
 * @returns Promise that resolves to the loaded pipeline
 */
async function loadModel(): Promise<FeatureExtractionPipeline> {
  // Ensure we're in browser
  if (!isBrowser()) {
    throw new Error(
      'embedding.client.ts can only be used in browser environment. ' +
      'Do not import this file in server-side code or API routes.'
    );
  }

  // If model is already loaded, return it
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  // If model is currently loading, wait for that promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading the model
  loadingState = 'loading';
  loadingPromise = (async (): Promise<FeatureExtractionPipeline> => {
    try {
      console.log('[Embedding Client] Loading model:', MODEL_NAME);
      
      // Use dynamic import to ensure this only runs in browser
      // pipeline() automatically uses WebAssembly when available
      const loadedPipeline = await pipeline(MODEL_TASK, MODEL_NAME, {
        // Use local files if available, otherwise download from HuggingFace
        // This enables offline usage after first load
        quantized: true, // Use quantized model for smaller size and faster loading
      });

      embeddingPipeline = loadedPipeline;
      loadingState = 'ready';
      console.log('[Embedding Client] Model loaded successfully');
      
      return loadedPipeline;
    } catch (error: any) {
      loadingState = 'error';
      loadingPromise = null; // Reset so we can retry
      console.error('[Embedding Client] Error loading model:', error);
      throw new Error(
        `Failed to load embedding model: ${error.message}. ` +
        'Make sure @xenova/transformers is installed and you have internet connection for first load.'
      );
    }
  })();

  return loadingPromise;
}

/**
 * Get the current loading state
 */
export function getEmbeddingLoadingState(): 'idle' | 'loading' | 'ready' | 'error' {
  return loadingState;
}

/**
 * Check if the model is ready to use
 */
export function isEmbeddingReady(): boolean {
  return loadingState === 'ready' && embeddingPipeline !== null;
}

/**
 * Generate embedding for a query text
 * 
 * Uses "query:" prefix as required by E5 models for better search performance
 * 
 * @param text - The query text to embed (e.g., "গর্ভাবস্থায় মাথাব্যথা কি বিপজ্জনক?")
 * @returns Promise that resolves to normalized embedding vector (number[])
 * 
 * @example
 * ```ts
 * const embedding = await embedQuery("গর্ভাবস্থায় মাথাব্যথা কি বিপজ্জনক?");
 * // Returns: [0.123, -0.456, 0.789, ...] (normalized vector)
 * ```
 */
export async function embedQuery(text: string): Promise<number[]> {
  if (!isBrowser()) {
    throw new Error('embedQuery can only be called in browser environment');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  // Ensure model is loaded
  const modelPipeline = await loadModel();

  try {
    // Add "query:" prefix for E5 models (required for optimal performance)
    const prefixedText = text.startsWith('query:') 
      ? text 
      : `query: ${text}`;

    console.log('[Embedding Client] Generating query embedding...');

    // Generate embeddings using the pipeline
    // The pipeline returns token embeddings, we need to pool them
    const output = await (modelPipeline as any)(prefixedText, {
      pooling: 'mean', // Mean pooling as specified
      normalize: true,  // Normalize embeddings as specified
    });

    // Extract the embedding vector
    // @xenova/transformers returns a tensor with .data property (Float32Array or similar)
    let embedding: number[];

    // Handle different output formats
    if (output && output.data) {
      // Most common: output.data is a TypedArray (Float32Array, etc.)
      if (output.data instanceof Float32Array || output.data instanceof Array) {
        embedding = Array.from(output.data);
      } else if (typeof output.data === 'object' && 'length' in output.data) {
        // Handle other TypedArray types
        embedding = Array.from(output.data as ArrayLike<number>);
      } else {
        throw new Error('Unexpected output.data format from embedding pipeline');
      }
    } else if (Array.isArray(output)) {
      // If output is directly an array
      embedding = output;
    } else if (output && typeof output === 'object') {
      // Try to extract from tensor-like structure
      const data = (output as any)?.data;
      if (data && (data instanceof Float32Array || Array.isArray(data))) {
        embedding = Array.from(data);
      } else {
        throw new Error('Unexpected output format from embedding pipeline');
      }
    } else {
      throw new Error('Unexpected output format from embedding pipeline');
    }

    // Ensure normalization (in case the model didn't normalize)
    // Calculate L2 norm
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0 && Math.abs(magnitude - 1.0) > 0.001) {
      // Only normalize if not already normalized (with small tolerance)
      embedding = embedding.map(val => val / magnitude);
    }

    console.log(`[Embedding Client] Generated embedding: ${embedding.length} dimensions`);
    
    return embedding;
  } catch (error: any) {
    console.error('[Embedding Client] Error generating query embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embedding for a passage/document text
 * 
 * Uses "passage:" prefix as required by E5 models for better search performance
 * 
 * @param text - The passage text to embed
 * @returns Promise that resolves to normalized embedding vector (number[])
 * 
 * @example
 * ```ts
 * const embedding = await embedPassage("গর্ভাবস্থায় মাথাব্যথা সাধারণত হরমোন পরিবর্তনের কারণে হয়।");
 * // Returns: [0.234, -0.567, 0.890, ...] (normalized vector)
 * ```
 */
export async function embedPassage(text: string): Promise<number[]> {
  if (!isBrowser()) {
    throw new Error('embedPassage can only be called in browser environment');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text must be a non-empty string');
  }

  // Ensure model is loaded
  const modelPipeline = await loadModel();

  try {
    // Add "passage:" prefix for E5 models (required for optimal performance)
    const prefixedText = text.startsWith('passage:') 
      ? text 
      : `passage: ${text}`;

    console.log('[Embedding Client] Generating passage embedding...');

    // Generate embeddings using the pipeline
    const output = await (modelPipeline as any)(prefixedText, {
      pooling: 'mean', // Mean pooling as specified
      normalize: true,  // Normalize embeddings as specified
    });

    // Extract the embedding vector (same logic as embedQuery)
    let embedding: number[];

    // Handle different output formats
    if (output && output.data) {
      // Most common: output.data is a TypedArray (Float32Array, etc.)
      if (output.data instanceof Float32Array || output.data instanceof Array) {
        embedding = Array.from(output.data);
      } else if (typeof output.data === 'object' && 'length' in output.data) {
        // Handle other TypedArray types
        embedding = Array.from(output.data as ArrayLike<number>);
      } else {
        throw new Error('Unexpected output.data format from embedding pipeline');
      }
    } else if (Array.isArray(output)) {
      // If output is directly an array
      embedding = output;
    } else if (output && typeof output === 'object') {
      // Try to extract from tensor-like structure
      const data = (output as any)?.data;
      if (data && (data instanceof Float32Array || Array.isArray(data))) {
        embedding = Array.from(data);
      } else {
        throw new Error('Unexpected output format from embedding pipeline');
      }
    } else {
      throw new Error('Unexpected output format from embedding pipeline');
    }

    // Ensure normalization (in case the model didn't normalize)
    // Calculate L2 norm
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0 && Math.abs(magnitude - 1.0) > 0.001) {
      // Only normalize if not already normalized (with small tolerance)
      embedding = embedding.map(val => val / magnitude);
    }

    console.log(`[Embedding Client] Generated embedding: ${embedding.length} dimensions`);
    
    return embedding;
  } catch (error: any) {
    console.error('[Embedding Client] Error generating passage embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Convenience function: Auto-detect if text should be treated as query or passage
 * Defaults to query if not specified
 * 
 * @param text - The text to embed
 * @param type - 'query' or 'passage' (default: 'query')
 * @returns Promise that resolves to normalized embedding vector
 */
export async function embedText(
  text: string, 
  type: 'query' | 'passage' = 'query'
): Promise<number[]> {
  return type === 'passage' ? embedPassage(text) : embedQuery(text);
}

/**
 * Preload the model (useful for warming up the model before first use)
 * 
 * Call this early in your app lifecycle to start loading the model
 * in the background, so it's ready when needed.
 * 
 * @example
 * ```ts
 * // In your app initialization
 * import { preloadEmbeddingModel } from '@/src/lib/embedding.client';
 * 
 * useEffect(() => {
 *   preloadEmbeddingModel();
 * }, []);
 * ```
 */
export async function preloadEmbeddingModel(): Promise<void> {
  if (!isBrowser()) {
    return; // Silently fail in server environment
  }

  if (embeddingPipeline || loadingPromise) {
    return; // Already loading or loaded
  }

  try {
    await loadModel();
  } catch (error) {
    // Don't throw - preloading is optional
    console.warn('[Embedding Client] Preload failed (will retry on first use):', error);
  }
}

/**
 * Reset the model (useful for testing or memory management)
 * Note: This will force a reload on next use
 */
export function resetEmbeddingModel(): void {
  embeddingPipeline = null;
  loadingPromise = null;
  loadingState = 'idle';
}

