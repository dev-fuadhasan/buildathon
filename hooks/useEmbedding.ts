'use client';

/**
 * React Hook for Client-Side Embeddings
 * 
 * Handles:
 * - Model loading state
 * - Error handling
 * - Embedding generation
 * - Vector search
 * 
 * Usage in components:
 * const { embedText, searchSimilar, isLoading, error } = useEmbedding();
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface EmbeddingState {
  isLoading: boolean;
  isModelReady: boolean;
  error: Error | null;
}

export interface SearchResult {
  index: number;
  similarity: number;
}

/**
 * Hook to manage embeddings in React components
 */
export function useEmbedding() {
  const [state, setState] = useState<EmbeddingState>({
    isLoading: false,
    isModelReady: false,
    error: null,
  });
  const [progress, setProgress] = useState<number>(0);
  const isMountedRef = useRef(true);

  // Dynamic imports to avoid static bundling of xenova
  const embedTextRef = useRef<any>(null);
  const embedTextBatchRef = useRef<any>(null);
  const cosineSimilarityRef = useRef<any>(null);
  const searchSimilarUtilRef = useRef<any>(null);
  const isModelLoadedRef = useRef<any>(null);
  const getModelLoadingPromiseRef = useRef<any>(null);
  const getEmbeddingPipelineRef = useRef<any>(null);
  const getModelProgressRef = useRef<any>(null);

  // Pre-load model on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Dynamically import embedding functions only when needed
        const mod = await import('../lib/embedding.client');
        
        embedTextRef.current = mod.embedText;
        embedTextBatchRef.current = mod.embedTextBatch;
        cosineSimilarityRef.current = mod.cosineSimilarity;
        searchSimilarUtilRef.current = mod.searchSimilar;
        isModelLoadedRef.current = mod.isModelLoaded;
        getModelLoadingPromiseRef.current = mod.getModelLoadingPromise;
        getEmbeddingPipelineRef.current = mod.getEmbeddingPipeline;
        getModelProgressRef.current = mod.getModelProgress;

        console.log('[useEmbedding] Embedding module imported successfully');

        // Check if already loaded
        if (isModelLoadedRef.current && isModelLoadedRef.current()) {
          setState(prev => ({ ...prev, isModelReady: true }));
          return;
        }

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Get or start the pipeline
        let promise = getModelLoadingPromiseRef.current && getModelLoadingPromiseRef.current();
        if (!promise && getEmbeddingPipelineRef.current) {
          try {
            console.log('[useEmbedding] Starting embedding pipeline...');
            promise = getEmbeddingPipelineRef.current();
          } catch (e) {
            console.error('[useEmbedding] ❌ Error starting pipeline:', e);
            throw e;
          }
        }

        if (promise) {
          // Poll progress while loading
          const pollInterval = 200;
          const intervalId = setInterval(() => {
            try {
              if (getModelProgressRef.current) {
                const p = getModelProgressRef.current();
                setProgress(p);
              }
            } catch (e) {
              // ignore
            }
          }, pollInterval);

          await promise;
          clearInterval(intervalId);
          setProgress(100);
          
          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              isModelReady: true,
              isLoading: false,
            }));
          }
        }
      } catch (err) {
        if (isMountedRef.current) {
          const error = err instanceof Error ? err : new Error(String(err));
          
          // Detailed error context for debugging
          console.error('[useEmbedding] ❌ CRITICAL: Model loading failed');
          console.error('[useEmbedding] Error message:', error.message);
          console.error('[useEmbedding] Full error:', error);
          
          setState(prev => ({
            ...prev,
            error,
            isLoading: false,
            // Important: set isModelReady to false so UI knows embeddings are unavailable
            isModelReady: false,
          }));
        }
      }
    };

    loadModel();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Embed single text
  const embed = useCallback(
    async (text: string, isQuery: boolean = true): Promise<number[] | null> => {
      if (!state.isModelReady || !embedTextRef.current) {
        console.warn('[useEmbedding] Model not ready yet');
        return null;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const embedding = await embedTextRef.current(text, isQuery);
        return embedding;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setState(prev => ({ ...prev, error }));
        }
        console.error('[useEmbedding] Embedding failed:', error);
        return null;
      } finally {
        if (isMountedRef.current) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    },
    [state.isModelReady]
  );

  // Embed multiple texts
  const embedBatch = useCallback(
    async (texts: string[], isQuery: boolean = false): Promise<number[][] | null> => {
      if (!state.isModelReady || !embedTextBatchRef.current) {
        console.warn('[useEmbedding] Model not ready yet');
        return null;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const embeddings = await embedTextBatchRef.current(texts, isQuery);
        return embeddings;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (isMountedRef.current) {
          setState(prev => ({ ...prev, error }));
        }
        console.error('[useEmbedding] Batch embedding failed:', error);
        return null;
      } finally {
        if (isMountedRef.current) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    },
    [state.isModelReady]
  );

  // Search similar embeddings
  const searchSimilar = useCallback(
    (
      queryEmbedding: number[],
      referenceEmbeddings: number[][],
      k: number = 3,
      minSimilarity: number = 0.3
    ): SearchResult[] => {
      if (!searchSimilarUtilRef.current) {
        return [];
      }
      try {
        return searchSimilarUtilRef.current(queryEmbedding, referenceEmbeddings, k, minSimilarity);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState(prev => ({ ...prev, error }));
        console.error('[useEmbedding] Search failed:', error);
        return [];
      }
    },
    []
  );

  // Calculate similarity between two embeddings
  const calculateSimilarity = useCallback(
    (embedding1: number[], embedding2: number[]): number => {
      if (!cosineSimilarityRef.current) {
        return 0;
      }
      try {
        return cosineSimilarityRef.current(embedding1, embedding2);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setState(prev => ({ ...prev, error }));
        console.error('[useEmbedding] Similarity calculation failed:', error);
        return 0;
      }
    },
    []
  );

  return {
    // State
    isLoading: state.isLoading,
    isModelReady: state.isModelReady,
    error: state.error,
    progress,

    // Methods
    embed,
    embedBatch,
    searchSimilar,
    calculateSimilarity,
  };
}

/**
 * Alternative hook for simple use cases (single embedding per component)
 * Manages embedding of a single text value
 */
export function useTextEmbedding(text: string | null, isQuery: boolean = true) {
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { embed, isModelReady } = useEmbedding();

  useEffect(() => {
    if (!text || !isModelReady) return;

    const generateEmbedding = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await embed(text, isQuery);
        if (result) {
          setEmbedding(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    generateEmbedding();
  }, [text, isQuery, isModelReady, embed]);

  return {
    embedding,
    isLoading,
    error,
    isModelReady,
  };
}
