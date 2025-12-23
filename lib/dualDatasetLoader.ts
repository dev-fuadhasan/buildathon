/**
 * Dual Dataset Loader for MomsCare
 * Handles both English and Bangla datasets for language-specific responses
 */

import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

// Dataset item structure
export interface DatasetItem {
  question_en: string;
  answer_en: string;
  question_bn: string;
  answer_bn: string;
  tag: string;
  context: string;
}

// Language type
export type Language = "en" | "bn";

// Dataset mode configuration
export type DatasetMode = "AUTO" | "EN" | "BN";

// Global dataset storage
let unifiedDataset: DatasetItem[] = [];
let isDatasetLoaded = false;

/**
 * Load and unify both English and Bangla datasets
 */
export function loadDualDataset(): void {
  if (isDatasetLoaded) {
    console.log("✅ Dual dataset already loaded");
    return;
  }

  try {
    const csvPathEN = path.join(process.cwd(), "moms_care_dataset.csv");
    const csvPathBN = path.join(process.cwd(), "moms_care_dataset_bangla.csv");

    // Check if files exist
    if (!fs.existsSync(csvPathEN)) {
      console.error("❌ English dataset not found:", csvPathEN);
      return;
    }
    if (!fs.existsSync(csvPathBN)) {
      console.error("❌ Bangla dataset not found:", csvPathBN);
      return;
    }

    // Read CSV files
    const csvContentEN = fs.readFileSync(csvPathEN, "utf-8");
    const csvContentBN = fs.readFileSync(csvPathBN, "utf-8");

    // Parse CSV files
    const recordsEN = parse(csvContentEN, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const recordsBN = parse(csvContentBN, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Verify both datasets have same length
    if (recordsEN.length !== recordsBN.length) {
      console.warn(
        `⚠️  Dataset mismatch: EN has ${recordsEN.length} rows, BN has ${recordsBN.length} rows`
      );
    }

    // Unify datasets by matching rows
    unifiedDataset = recordsEN.map((enRow: any, index: number) => {
      const bnRow: any = recordsBN[index] || {};
      return {
        question_en: (enRow.question || "") as string,
        answer_en: (enRow.answer || "") as string,
        question_bn: (bnRow.question || "") as string,
        answer_bn: (bnRow.answer || "") as string,
        tag: (enRow.tag || bnRow.tag || "") as string,
        context: (enRow.context || bnRow.context || "") as string,
      };
    });

    isDatasetLoaded = true;
    console.log(`✅ Dual dataset loaded: ${unifiedDataset.length} Q&A pairs`);
  } catch (error) {
    console.error("❌ Error loading dual dataset:", error);
  }
}

/**
 * Get the unified dataset
 */
export function getUnifiedDataset(): DatasetItem[] {
  if (!isDatasetLoaded) {
    loadDualDataset();
  }
  return unifiedDataset;
}

/**
 * Semantic search using vector embeddings (async)
 * @param query - User query
 * @param language - Language to search ("en" or "bn")
 * @param limit - Number of results to return
 * @returns Promise of array of matching dataset items
 */
export async function searchDatasetSemantic(
  query: string,
  language: Language,
  limit: number = 3
): Promise<DatasetItem[]> {
  try {
    // Try to use server-side semantic search first
    const { semanticSearchServer } = await import('./supabaseSemanticSearchServer');
    
    // Call server-side semantic search
    const results = await semanticSearchServer(query, { maxResults: limit });
    
    // Convert SearchResult to DatasetItem format
    const convertedResults = results.map(result => ({
      question_en: result.question,
      answer_en: result.answer,
      question_bn: result.question,
      answer_bn: result.answer,
      tag: result.category || '',
      context: ''
    }));
    
    if (convertedResults.length > 0) {
      console.log(`[Dataset] ✅ Semantic search: ${convertedResults.length} results (best similarity: ${results[0]?.similarity?.toFixed(3) || 'N/A'})`);
      return convertedResults;
    }
  } catch (error) {
    console.warn('[Dataset] ⚠️ Semantic search failed:', error);
  }
  
  // Fallback to keyword search
  return await searchDatasetByLanguage(query, language, limit);
}

/**
 * Hybrid search: Try semantic search first, fallback to keyword search
 * @param query - User query
 * @param language - Language to search ("en" or "bn")
 * @param limit - Number of results to return
 * @returns Promise of array of matching dataset items
 */
export async function searchDatasetHybrid(
  query: string,
  language: Language,
  limit: number = 3
): Promise<DatasetItem[]> {
  const startTime = Date.now();
  // Try semantic search first
  try {
    const { semanticSearchServer } = await import('./supabaseSemanticSearchServer');
    const { logVectorSearch } = await import('./vectorSearchAnalytics');
    
    // Use server-side semantic search
    const results = await semanticSearchServer(query, { maxResults: limit });
    
    // Convert SearchResult to the expected format with similarity
    const convertedResults = results.map(result => ({
      similarity: result.similarity || 0.5, // Default similarity if not provided
      item: {
        question_en: language === 'en' ? result.question : '',
        answer_en: language === 'en' ? result.answer : '',
        question_bn: language === 'bn' ? result.question : '',
        answer_bn: language === 'bn' ? result.answer : '',
        tag: result.category || '',
        context: ''
      }
    }));
    
    // If we have good results (similarity > 0.4), use them
    if (convertedResults.length > 0 && convertedResults[0].similarity > 0.4) {
      console.log(`[Dataset] ✅ Semantic search: ${convertedResults.length} results (best: ${convertedResults[0].similarity.toFixed(3)})`);
      // Log as hybrid success
      logVectorSearch({
        query,
        language,
        method: 'hybrid',
        resultsCount: convertedResults.length,
        bestSimilarity: convertedResults[0].similarity,
        searchTimeMs: Date.now() - startTime,
        embeddingsLoaded: true,
      });
      return convertedResults.map(r => r.item);
    }
  } catch (error) {
    console.warn('[Dataset] ⚠️ Semantic search failed:', error);
  }
  
  // Fallback to keyword search
  console.log('[Dataset] 📝 Using keyword search fallback');
  const keywordResults = await searchDatasetByLanguage(query, language, limit);
  
  // Log keyword search
  const { logVectorSearch } = await import('./vectorSearchAnalytics');
  logVectorSearch({
    query,
    language,
    method: 'keyword',
    resultsCount: keywordResults.length,
    searchTimeMs: Date.now() - startTime,
    embeddingsLoaded: false,
  });
  
  return keywordResults;
}

/**
 * Search dataset based on language (keyword-based, synchronous)
 * @param query - User query
 * @param language - Language to search ("en" or "bn")
 * @param limit - Number of results to return
 * @returns Array of matching dataset items
 */
export async function searchDatasetByLanguage(
  query: string,
  language: Language,
  limit: number = 3
): Promise<DatasetItem[]> {
  // Import the semantic search server module
  const { semanticSearchServer } = await import('./supabaseSemanticSearchServer');
  
  try {
    // Use keyword search functionality from semanticSearchServer
    const results = await semanticSearchServer(query, { maxResults: limit * 5 });
    
    // Convert SearchResult to DatasetItem format
    const datasetItems: DatasetItem[] = results.map(result => ({
      question_en: result.question,
      answer_en: result.answer,
      question_bn: result.question,
      answer_bn: result.answer,
      tag: result.category || '',
      context: ''
    }));
    
    // Filter and score results based on language
    const queryLower = query.toLowerCase();
    const scoredResults: Array<{ item: DatasetItem; score: number }> = [];
    
    for (const item of datasetItems) {
      let score = 0;
      const question =
        language === "en" ? item.question_en : item.question_bn;
      const answer = language === "en" ? item.answer_en : item.answer_bn;
      const questionLower = question.toLowerCase();
      const answerLower = answer.toLowerCase();

      // Extract query keywords
      const queryWords = queryLower
        .split(/\s+/)
        .filter((word) => word.length > 2);

      // Score based on keyword matching
      for (const word of queryWords) {
        // Question match (higher weight)
        if (questionLower.includes(word)) {
          score += 10;
        }

        // Answer match (medium weight)
        if (answerLower.includes(word)) {
          score += 5;
        }

        // Tag match (high weight)
        if (item.tag.toLowerCase().includes(word)) {
          score += 8;
        }

        // Context match (medium weight)
        // Skip context scoring for now since it's not in SearchResult
      }

      // Boost score for exact phrase matches
      if (questionLower.includes(queryLower)) {
        score += 50;
      }
      if (answerLower.includes(queryLower)) {
        score += 30;
      }

      // QUALITY FILTER: Only include results with meaningful matches (25+ points)
      // This prevents returning irrelevant Q&A that only match 1-2 common words
      if (score >= 25) {
        scoredResults.push({ item, score });
      }
    }

    // Sort by score (descending) and return top results
    scoredResults.sort((a, b) => b.score - a.score);
    console.log(`[Dataset Search] Found ${scoredResults.length} quality results (score >= 25) for language: ${language}`);
    return scoredResults.slice(0, limit).map((result) => result.item);
  } catch (error) {
    console.error('[Dataset Search] Error in keyword search:', error);
    return [];
  }
}

/**
 * Search both EN and BN datasets simultaneously (for Banglish queries)
 * Combines results from both languages and ranks by relevance score
 * @param query - User query (Banglish)
 * @param limit - Number of results to return
 * @returns Array of matching dataset items sorted by score
 */
export async function searchDatasetDual(
  query: string,
  limit: number = 3
): Promise<DatasetItem[]> {
  // Import the semantic search server module
  const { semanticSearchServer } = await import('./supabaseSemanticSearchServer');
  
  try {
    // Use keyword search functionality from semanticSearchServer to get all records
    const results = await semanticSearchServer(query, { maxResults: limit * 10 });
    
    // Convert SearchResult to DatasetItem format
    const datasetItems: DatasetItem[] = results.map(result => ({
      question_en: result.question,
      answer_en: result.answer,
      question_bn: result.question,
      answer_bn: result.answer,
      tag: result.category || '',
      context: ''
    }));

    const queryLower = query.toLowerCase();
    const scoredResults: Array<{ item: DatasetItem; score: number; source: 'en' | 'bn' }> = [];

    // Search BOTH datasets simultaneously
    for (const item of datasetItems) {
      // Score against English content
      let enScore = 0;
      const questionEn = item.question_en.toLowerCase();
      const answerEn = item.answer_en.toLowerCase();

      // Score against Bangla content
      let bnScore = 0;
      const questionBn = item.question_bn.toLowerCase();
      const answerBn = item.answer_bn.toLowerCase();

      // Extract query keywords
      const queryWords = queryLower
        .split(/\s+/)
        .filter((word) => word.length > 2);

      // Score both EN and BN versions
      for (const word of queryWords) {
        // EN scoring
        if (questionEn.includes(word)) enScore += 10;
        if (answerEn.includes(word)) enScore += 5;
        
        // BN scoring
        if (questionBn.includes(word)) bnScore += 10;
        if (answerBn.includes(word)) bnScore += 5;
        
        // Tag and context (language-agnostic)
        if (item.tag.toLowerCase().includes(word)) {
          enScore += 8;
          bnScore += 8;
        }
        // Skip context scoring for now since it's not in SearchResult
      }

      // Boost for exact phrase matches
      if (questionEn.includes(queryLower)) enScore += 50;
      if (answerEn.includes(queryLower)) enScore += 30;
      if (questionBn.includes(queryLower)) bnScore += 50;
      if (answerBn.includes(queryLower)) bnScore += 30;

      // Use the BEST score from either language
      const bestScore = Math.max(enScore, bnScore);
      const bestSource = enScore > bnScore ? 'en' : 'bn';

      // QUALITY FILTER: Only include results with meaningful matches (25+ points)
      // This prevents returning irrelevant Q&A that only match 1-2 common words
      if (bestScore >= 25) {
        scoredResults.push({ item, score: bestScore, source: bestSource });
      }
    }

    // Sort by score (descending) and return top results
    scoredResults.sort((a, b) => b.score - a.score);
    
    console.log(`[Dual Search] Found ${scoredResults.length} quality results (score >= 25), top ${Math.min(limit, scoredResults.length)}:`);
    scoredResults.slice(0, limit).forEach((r, i) => {
      console.log(`  ${i+1}. Score: ${r.score} (${r.source}) - ${r.item.question_en.substring(0, 60)}...`);
    });
    
    // Return top results, or empty array if no quality matches
    return scoredResults.slice(0, limit).map((result) => result.item);
  } catch (error) {
    console.error('[Dual Search] Error in dual search:', error);
    return [];
  }
}

/**
 * Format dataset results as context for AI
 * @param items - Array of dataset items
 * @param language - Language to format
 * @returns Formatted context string
 */
export function formatDatasetContext(
  items: DatasetItem[],
  language: Language
): string {
  if (items.length === 0) {
    return "";
  }

  const contextParts = items.map((item, index) => {
    const question =
      language === "en" ? item.question_en : item.question_bn;
    const answer = language === "en" ? item.answer_en : item.answer_bn;

    return `
[${language.toUpperCase()} Q&A ${index + 1}]
Q: ${question}
A: ${answer}
Tag: ${item.tag}
Context: ${item.context}
`.trim();
  });

  return `
REFERENCE Q&A FROM KNOWLEDGE BASE (Use ONLY if directly relevant to user's question):
${contextParts.join("\n\n---\n\n")}

IMPORTANT: If these Q&A examples are about DIFFERENT topics than the user's question, IGNORE THEM and answer from your own knowledge.
`.trim();
}

/**
 * Get random sample questions for testing
 * @param language - Language to get samples
 * @param count - Number of samples
 * @returns Array of sample questions
 */
export function getSampleQuestions(
  language: Language,
  count: number = 5
): string[] {
  if (!isDatasetLoaded) {
    loadDualDataset();
  }

  if (unifiedDataset.length === 0) {
    return [];
  }

  // Get random indices
  const indices = new Set<number>();
  while (indices.size < Math.min(count, unifiedDataset.length)) {
    indices.add(Math.floor(Math.random() * unifiedDataset.length));
  }

  // Get questions for selected language
  return Array.from(indices).map((index) => {
    const item = unifiedDataset[index];
    return language === "en" ? item.question_en : item.question_bn;
  });
}

/**
 * Initialize the dataset at server startup
 */
export function initializeDualDataset(): void {
  loadDualDataset();
}

// Auto-load on module import
initializeDualDataset();

