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
import {
  embedText,
  embedTextBatch,
  cosineSimilarity,
  searchSimilar as searchSimilarUtil,
  isModelLoaded,
  getModelLoadingPromise,
  getEmbeddingPipeline,
} from '../lib/embedding.client';
import { getModelProgress } from '../lib/embedding.client';

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
    isModelReady: isModelLoaded(),
    error: null,
  });
  const [progress, setProgress] = useState<number>(0);

  const isMountedRef = useRef(true);

  // Pre-load model on mount
  useEffect(() => {
    const loadModel = async () => {
      if (isModelLoaded()) {
        setState(prev => ({ ...prev, isModelReady: true }));
        return;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // If pipeline not started, start it proactively so progress is reported
        let promise = getModelLoadingPromise();
        if (!promise) {
          try {
            // Kick off pipeline load
            promise = getEmbeddingPipeline();
          } catch (e) {
            // ignore - getEmbeddingPipeline may throw if not client, will be caught below
          }
        }

        if (promise) {
          // Poll progress while loading to surface a progress bar in UI
          const pollInterval = 200;
          const intervalId = setInterval(() => {
            try {
              const p = getModelProgress();
              setProgress(p);
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
          setState(prev => ({
            ...prev,
            error,
            isLoading: false,
          }));
          console.error('[useEmbedding] Model loading failed:', error);
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
      if (!state.isModelReady) {
        console.warn('[useEmbedding] Model not ready yet');
        return null;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const embedding = await embedText(text, isQuery);
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
      if (!state.isModelReady) {
        console.warn('[useEmbedding] Model not ready yet');
        return null;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const embeddings = await embedTextBatch(texts, isQuery);
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
      try {
        return searchSimilarUtil(queryEmbedding, referenceEmbeddings, k, minSimilarity);
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
      try {
        return cosineSimilarity(embedding1, embedding2);
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
