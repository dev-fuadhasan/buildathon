/**
 * HUGGING FACE EMBEDDING SERVICE
 * =============================
 * 
 * Uses Hugging Face Inference API to generate embeddings
 * This provides a free and reliable embedding service for vector search
 */

import { InferenceClient } from "@huggingface/inference";

// Initialize Hugging Face client
let hfClient: InferenceClient | null = null;

function initializeHuggingFaceClient(): InferenceClient {
  if (hfClient) {
    return hfClient;
  }

  const hfToken = process.env.HF_TOKEN;
  if (!hfToken) {
    throw new Error("HF_TOKEN environment variable is required for Hugging Face embeddings");
  }

  hfClient = new InferenceClient(hfToken);
  return hfClient;
}

/**
 * Generate embedding using Hugging Face Inference API
 * Uses the sentence-transformers/all-MiniLM-L6-v2 model which produces 384-dimensional embeddings
 */
export async function generateEmbeddingWithHuggingFace(text: string): Promise<number[]> {
  try {
    const client = initializeHuggingFaceClient();
    
    // For query embeddings, we typically prefix with "query: " for models trained with this convention
    const inputText = `query: ${text}`;
    
    console.log('[Hugging Face Embedding] Generating embedding for:', inputText.substring(0, 50) + '...');
    
    // Generate embedding using the feature extraction pipeline
    const result = await client.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2",
      inputs: inputText,
    });
    
    // The result is a Float32Array, convert to regular array
    let embedding: number[];
    
    if (Array.isArray(result)) {
      // If it's already an array
      embedding = result as number[];
    } else if (result && typeof result === 'object' && (result as any).constructor && (result as any).constructor.name === 'Float32Array') {
      // If it's a Float32Array, convert to regular array
      embedding = Array.from(result as Float32Array);
    } else if (typeof result === 'object' && result !== null && 'data' in result) {
      // If it's an object with a data property (like Tensor)
      const tensorData = (result as any).data;
      if (tensorData && typeof tensorData === 'object' && (tensorData as any).constructor && (tensorData as any).constructor.name === 'Float32Array') {
        embedding = Array.from(tensorData as Float32Array);
      } else if (Array.isArray(tensorData)) {
        embedding = tensorData as number[];
      } else {
        throw new Error("Unexpected embedding format from Hugging Face API");
      }
    } else {
      throw new Error("Unexpected embedding format from Hugging Face API");
    }
    
    // Validate embedding dimensions
    if (embedding.length !== 384) {
      console.warn(`[Hugging Face Embedding] Unexpected embedding dimension: ${embedding.length}. Expected 384.`);
    }
    
    console.log(`[Hugging Face Embedding] Successfully generated embedding with ${embedding.length} dimensions`);
    
    return embedding;
  } catch (error) {
    console.error('[Hugging Face Embedding] Error generating embedding:', error);
    throw new Error(`Failed to generate embedding with Hugging Face: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Alternative implementation using direct fetch API
 * This can be useful if the InferenceClient doesn't work in certain environments
 */
export async function generateEmbeddingWithFetch(text: string): Promise<number[]> {
  try {
    const hfToken = process.env.HF_TOKEN;
    if (!hfToken) {
      throw new Error("HF_TOKEN environment variable is required for Hugging Face embeddings");
    }
    
    const inputText = `query: ${text}`;
    
    console.log('[Hugging Face Embedding - Fetch] Generating embedding for:', inputText.substring(0, 50) + '...');
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: inputText,
        }),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    
    // The result is typically a 2D array [[embedding_values]]
    let embedding: number[];
    
    if (Array.isArray(result) && result.length > 0) {
      if (Array.isArray(result[0])) {
        // 2D array case
        embedding = result[0] as number[];
      } else {
        // 1D array case
        embedding = result as number[];
      }
    } else {
      throw new Error("Unexpected response format from Hugging Face API");
    }
    
    // Validate embedding dimensions
    if (embedding.length !== 384) {
      console.warn(`[Hugging Face Embedding - Fetch] Unexpected embedding dimension: ${embedding.length}. Expected 384.`);
    }
    
    console.log(`[Hugging Face Embedding - Fetch] Successfully generated embedding with ${embedding.length} dimensions`);
    
    return embedding;
  } catch (error) {
    console.error('[Hugging Face Embedding - Fetch] Error generating embedding:', error);
    throw new Error(`Failed to generate embedding with Hugging Face (fetch): ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Hybrid approach - try InferenceClient first, fallback to fetch
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Try InferenceClient first
    return await generateEmbeddingWithHuggingFace(text);
  } catch (error) {
    console.warn('[Hugging Face Embedding] InferenceClient failed, trying fetch approach:', error);
    try {
      // Fallback to fetch
      return await generateEmbeddingWithFetch(text);
    } catch (fetchError) {
      console.error('[Hugging Face Embedding] Both approaches failed:', fetchError);
      throw fetchError;
    }
  }
}