/**
 * CLIENT-SIDE VECTOR SEARCH
 * 
 * Completely browser-based semantic search using client-side embeddings
 * No API keys, no server calls, works offline after first model load
 */

import { embedText, searchSimilar } from './embedding.client';

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  embedding: number[]; // Pre-computed from embeddings.json
}

export interface SearchMatch {
  id: string;
  question: string;
  answer: string;
  similarity: number;
}

/**
 * Load pre-computed embeddings from embeddings.json
 * These should already exist in your project
 */
export async function loadEmbeddings(): Promise<QAPair[]> {
  try {
    console.log('[Vector Search] Loading pre-computed embeddings...');

    const response = await fetch('/embeddings.json');
    if (!response.ok) {
      throw new Error(`Failed to load embeddings: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Vector Search] Loaded ${data.length} embeddings`);
    return data;
  } catch (error) {
    console.error('[Vector Search] Error loading embeddings:', error);
    throw error;
  }
}

/**
 * Perform semantic search on Q&A database
 * 
 * @param query - User's question in any language (English, Bangla, Banglish)
 * @param qaDatabase - Array of Q&A pairs with pre-computed embeddings
 * @param topK - Number of results to return
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Array of matching Q&A pairs sorted by relevance
 * 
 * Example:
 *   const results = await semanticSearch(
 *     "মাথাব্যথা সাধারণ কি?",
 *     qaDatabase,
 *     3,
 *     0.3
 *   );
 */
export async function semanticSearch(
  query: string,
  qaDatabase: QAPair[],
  topK: number = 3,
  minSimilarity: number = 0.3
): Promise<SearchMatch[]> {
  if (!query.trim()) {
    console.warn('[Vector Search] Empty query');
    return [];
  }

  if (qaDatabase.length === 0) {
    console.warn('[Vector Search] Empty QA database');
    return [];
  }

  try {
    console.log(`[Vector Search] Searching for: "${query.substring(0, 50)}..."`);

    // Step 1: Generate embedding for user query
    console.log('[Vector Search] Generating query embedding...');
    const queryEmbedding = await embedText(query, true);

    // Step 2: Prepare reference embeddings
    const referenceEmbeddings = qaDatabase.map(qa => qa.embedding);

    // Step 3: Find top matches using cosine similarity
    console.log(
      `[Vector Search] Searching across ${qaDatabase.length} Q&A pairs...`
    );
    const matches = searchSimilar(queryEmbedding, referenceEmbeddings, topK, minSimilarity);

    // Step 4: Map results back to Q&A data
    const results: SearchMatch[] = matches.map(match => ({
      ...qaDatabase[match.index],
      similarity: match.similarity,
    }));

    console.log(
      `[Vector Search] Found ${results.length} matches (${topK} requested)`
    );
    results.forEach((r, i) => {
      console.log(
        `  ${i + 1}. Q: "${r.question.substring(0, 40)}..." (${(r.similarity * 100).toFixed(1)}%)`
      );
    });

    return results;
  } catch (error) {
    console.error('[Vector Search] Search failed:', error);
    throw error;
  }
}

/**
 * Fallback keyword search (for when semantic search isn't available)
 * Useful as a backup if embeddings fail
 */
export function keywordSearch(
  query: string,
  qaDatabase: QAPair[],
  topK: number = 3
): SearchMatch[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  if (queryWords.length === 0) return [];

  const scored = qaDatabase.map(qa => {
    const questionLower = qa.question.toLowerCase();
    const answerLower = qa.answer.toLowerCase();

    // Count keyword matches
    let matches = 0;
    for (const word of queryWords) {
      if (questionLower.includes(word)) matches += 2;
      if (answerLower.includes(word)) matches += 1;
    }

    return {
      ...qa,
      similarity: matches > 0 ? Math.min(matches / (queryWords.length * 2), 1) : 0,
    };
  });

  return scored
    .filter(item => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK) as SearchMatch[];
}

/**
 * Hybrid search: Try semantic search first, fallback to keyword search
 * 
 * This is the most robust approach for production
 */
export async function hybridSearch(
  query: string,
  qaDatabase: QAPair[],
  topK: number = 3,
  minSimilarity: number = 0.3
): Promise<SearchMatch[]> {
  try {
    // Try semantic search first
    const semanticResults = await semanticSearch(query, qaDatabase, topK, minSimilarity);

    if (semanticResults.length > 0) {
      console.log('[Vector Search] Using semantic results');
      return semanticResults;
    }

    // Fallback to keyword search
    console.log('[Vector Search] Semantic search returned no results, trying keyword search...');
    const keywordResults = keywordSearch(query, qaDatabase, topK);

    return keywordResults;
  } catch (error) {
    console.error('[Vector Search] Semantic search failed, using keyword fallback:', error);
    const keywordResults = keywordSearch(query, qaDatabase, topK);
    return keywordResults;
  }
}

/**
 * Format search results for display in chat
 */
export function formatSearchResults(results: SearchMatch[]): string {
  if (results.length === 0) return '';

  const formatted = results
    .map(
      (r, i) =>
        `${i + 1}. **Q:** ${r.question}\n   **A:** ${r.answer.substring(0, 200)}...\n   *Relevance: ${(r.similarity * 100).toFixed(0)}%*`
    )
    .join('\n\n');

  return formatted;
}

/**
 * Get search statistics for monitoring
 */
export interface SearchStats {
  totalDocuments: number;
  searchDuration: number; // milliseconds
  resultsFound: number;
  avgSimilarity: number;
  modelLoadTime: number; // milliseconds
}

let modelLoadTime = 0;

export function setModelLoadTime(time: number) {
  modelLoadTime = time;
}

export function getModelLoadTime(): number {
  return modelLoadTime;
}

/**
 * Advanced: Search with statistics tracking
 */
export async function searchWithStats(
  query: string,
  qaDatabase: QAPair[],
  topK: number = 3
): Promise<{ results: SearchMatch[]; stats: SearchStats }> {
  const startTime = performance.now();

  try {
    const results = await semanticSearch(query, qaDatabase, topK);
    const duration = performance.now() - startTime;

    const stats: SearchStats = {
      totalDocuments: qaDatabase.length,
      searchDuration: duration,
      resultsFound: results.length,
      avgSimilarity: results.length > 0 ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length : 0,
      modelLoadTime: modelLoadTime,
    };

    console.log('[Vector Search Stats]', stats);

    return { results, stats };
  } catch (error) {
    const duration = performance.now() - startTime;
    throw {
      error,
      duration,
    };
  }
}
