/**
 * Vector Search Module for MomsCare
 * Implements semantic search using vector embeddings and cosine similarity
 */

import fs from 'fs';
import path from 'path';
import { generateQueryEmbedding, generateEmbedding, areEmbeddingsAvailable } from './embeddings';
import { execFileSync } from 'child_process';
import { DatasetItem, Language } from './dualDatasetLoader';
import { logVectorSearch } from './vectorSearchAnalytics';

// Embedding storage structure
export interface EmbeddingItem {
  id: number;
  question_en: string;
  answer_en: string;
  question_bn: string;
  answer_bn: string;
  tag: string;
  context: string;
  questionEmbedding_en: number[];
  questionEmbedding_bn: number[];
  // Optional: answer embeddings for hybrid search
  answerEmbedding_en?: number[];
  answerEmbedding_bn?: number[];
}

// Search result with similarity score
export interface SearchResult {
  item: DatasetItem;
  similarity: number;
  language: Language;
}

// Global cache
let embeddingsCache: EmbeddingItem[] | null = null;
let isEmbeddingsLoaded = false;
const EMBEDDINGS_FILE = path.join(process.cwd(), 'embeddings.json');

/**
 * Load embeddings from JSON file
 */
export function loadEmbeddings(): EmbeddingItem[] {
  if (isEmbeddingsLoaded && embeddingsCache) {
    return embeddingsCache;
  }

  try {
    if (!fs.existsSync(EMBEDDINGS_FILE)) {
      console.warn(`⚠️  [Vector Search] Embeddings file not found: ${EMBEDDINGS_FILE}`);
      console.warn(`⚠️  [Vector Search] Run 'npm run generate-embeddings' to create embeddings`);
      return [];
    }

    const fileContent = fs.readFileSync(EMBEDDINGS_FILE, 'utf-8');
    const loadedEmbeddings = JSON.parse(fileContent) as EmbeddingItem[];
    embeddingsCache = loadedEmbeddings;
    isEmbeddingsLoaded = true;
    console.log(`✅ [Vector Search] Loaded ${loadedEmbeddings.length} embeddings from ${EMBEDDINGS_FILE}`);
    return loadedEmbeddings;
  } catch (error) {
    console.error('[Vector Search] Error loading embeddings:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Similarity score between -1 and 1 (higher is more similar)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error(`Vector dimensions mismatch: ${vecA.length} vs ${vecB.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  // Avoid division by zero
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Perform semantic search using vector embeddings
 * @param query - User query text
 * @param language - Language to search ("en" or "bn")
 * @param limit - Number of results to return (default: 3)
 * @param minSimilarity - Minimum similarity threshold (default: 0.3)
 * @returns Array of search results sorted by similarity
 */
export async function semanticSearch(
  query: string,
  language: Language,
  limit: number = 3,
  minSimilarity: number = 0.3
): Promise<SearchResult[]> {
  const startTime = Date.now();
  try {
    // Load embeddings (pre-computed)
    const embeddings = loadEmbeddings();
    const embeddingsLoaded = embeddings.length > 0;
    
    if (embeddings.length === 0) {
      console.warn('[Vector Search] No embeddings available, falling back to empty results');
      logVectorSearch({
        query,
        language,
        method: 'keyword',
        resultsCount: 0,
        embeddingsLoaded: false,
      });
      return [];
    }

    // Generate query embedding locally via Python helper (same model used offline)
    let queryEmbedding: number[];
    try {
      const scriptPath = path.join(process.cwd(), 'scripts', 'query_embed.py');
      const out = execFileSync('python', [scriptPath, query], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      const parsed = JSON.parse(out);
      if (!parsed || !parsed.embedding) throw new Error(parsed && parsed.error ? parsed.error : 'No embedding');
      queryEmbedding = parsed.embedding as number[];
    } catch (err: any) {
      console.error('[Vector Search] Local embedding generation failed:', err && err.message ? err.message : err);
      logVectorSearch({
        query,
        language,
        method: 'keyword',
        resultsCount: 0,
        embeddingsLoaded: false,
      });
      return [];
    }

    // Calculate similarities
    const results: SearchResult[] = [];
    let loggedDimensionMismatch = false;

    for (const embeddingItem of embeddings) {
      // Get the appropriate question embedding based on language
      const questionEmbedding = language === 'en' 
        ? embeddingItem.questionEmbedding_en 
        : embeddingItem.questionEmbedding_bn;

      if (!questionEmbedding || questionEmbedding.length === 0) {
        continue;
      }

      // Handle dimension mismatch (some models produce 384, others 768)
      // If dimensions don't match, we can't calculate similarity directly
      // For now, skip items with mismatched dimensions
      // TODO: Implement dimension projection or use same model for both
      if (queryEmbedding.length !== questionEmbedding.length) {
        // Log first mismatch for debugging
        if (!loggedDimensionMismatch) {
          console.warn(`[Vector Search] Dimension mismatch detected: query=${queryEmbedding.length}, embedding=${questionEmbedding.length}. Some items will be skipped.`);
          loggedDimensionMismatch = true;
        }
        continue;
      }

      // Calculate similarity
      const similarity = cosineSimilarity(queryEmbedding, questionEmbedding);

      // Filter by minimum similarity threshold
      if (similarity >= minSimilarity) {
        results.push({
          item: {
            question_en: embeddingItem.question_en,
            answer_en: embeddingItem.answer_en,
            question_bn: embeddingItem.question_bn,
            answer_bn: embeddingItem.answer_bn,
            tag: embeddingItem.tag,
            context: embeddingItem.context,
          },
          similarity,
          language,
        });
      }
    }

    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);

    // Return top results
    const topResults = results.slice(0, limit);
    const searchTime = Date.now() - startTime;
    const bestSimilarity = topResults.length > 0 ? topResults[0].similarity : undefined;
    
    console.log(`[Vector Search] Found ${results.length} results (similarity >= ${minSimilarity}), returning top ${topResults.length}`);
    if (topResults.length > 0) {
      topResults.forEach((r, i) => {
        const question = language === 'en' ? r.item.question_en : r.item.question_bn;
        console.log(`  ${i + 1}. Similarity: ${r.similarity.toFixed(3)} - ${question.substring(0, 60)}...`);
      });
    }

    // Log analytics
    logVectorSearch({
      query,
      language,
      method: 'vector',
      resultsCount: topResults.length,
      bestSimilarity,
      searchTimeMs: searchTime,
      embeddingsLoaded: true,
    });

    return topResults;
  } catch (error) {
    console.error('[Vector Search] Error during semantic search:', error);
    const searchTime = Date.now() - startTime;
    logVectorSearch({
      query,
      language,
      method: 'keyword',
      resultsCount: 0,
      searchTimeMs: searchTime,
      embeddingsLoaded: false,
    });
    return [];
  }
}

/**
 * Hybrid search: Combines question and answer embeddings for better results
 * @param query - User query
 * @param language - Language
 * @param limit - Number of results
 * @param questionWeight - Weight for question similarity (default: 0.7)
 * @param answerWeight - Weight for answer similarity (default: 0.3)
 */
export async function hybridSearch(
  query: string,
  language: Language,
  limit: number = 3,
  questionWeight: number = 0.7,
  answerWeight: number = 0.3
): Promise<SearchResult[]> {
  try {
    const embeddings = loadEmbeddings();
    
    if (embeddings.length === 0) {
      return [];
    }

    const queryEmbedding = await generateQueryEmbedding(query);
    const results: SearchResult[] = [];

    for (const embeddingItem of embeddings) {
      const questionEmbedding = language === 'en' 
        ? embeddingItem.questionEmbedding_en 
        : embeddingItem.questionEmbedding_bn;
      
      const answerEmbedding = language === 'en'
        ? embeddingItem.answerEmbedding_en
        : embeddingItem.answerEmbedding_bn;

      if (!questionEmbedding) continue;

      // Calculate question similarity
      const questionSim = cosineSimilarity(queryEmbedding, questionEmbedding);
      
      // Calculate answer similarity if available
      let answerSim = 0;
      if (answerEmbedding && answerEmbedding.length > 0) {
        answerSim = cosineSimilarity(queryEmbedding, answerEmbedding);
      }

      // Weighted combination
      const combinedSimilarity = (questionSim * questionWeight) + (answerSim * answerWeight);

      if (combinedSimilarity >= 0.3) {
        results.push({
          item: {
            question_en: embeddingItem.question_en,
            answer_en: embeddingItem.answer_en,
            question_bn: embeddingItem.question_bn,
            answer_bn: embeddingItem.answer_bn,
            tag: embeddingItem.tag,
            context: embeddingItem.context,
          },
          similarity: combinedSimilarity,
          language,
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  } catch (error) {
    console.error('[Vector Search] Error during hybrid search:', error);
    return [];
  }
}

/**
 * Clear embeddings cache (useful for reloading after regeneration)
 */
export function clearEmbeddingsCache(): void {
  embeddingsCache = null;
  isEmbeddingsLoaded = false;
  console.log('[Vector Search] Embeddings cache cleared');
}

/**
 * Check if embeddings are available
 */
export function hasEmbeddings(): boolean {
  return fs.existsSync(EMBEDDINGS_FILE);
}

