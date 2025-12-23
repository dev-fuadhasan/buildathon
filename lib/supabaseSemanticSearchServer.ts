/**
 * SERVER-SIDE SUPABASE SEMANTIC SEARCH
 * ====================================
 * 
 * Used in API routes for server-side semantic search
 * without 'use client' directive
 */

import { createClient } from '@supabase/supabase-js';

// Simple in-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let supabaseClient: any = null;

// Function to get cached embedding
function getCachedEmbedding(query: string): number[] | null {
  const cached = embeddingCache.get(query);
  if (cached) {
    console.log(`[🔍 SEMANTIC SEARCH] Found cached embedding for query: "${query.substring(0, 30)}..."`);
    return cached;
  }
  return null;
}

// Function to cache embedding
function cacheEmbedding(query: string, embedding: number[]): void {
  // Clean up old entries if cache is full
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) {
      embeddingCache.delete(firstKey);
    }
  }
  
  embeddingCache.set(query, embedding);
  console.log(`[🔍 SEMANTIC SEARCH] Cached embedding for query: "${query.substring(0, 30)}..."`);
}

function initializeSupabaseSearch(): boolean {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[SemanticSearch] Supabase credentials missing');
      return false;
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[SemanticSearch] ✓ Supabase initialized');
    return true;
  } catch (err) {
    console.error('[SemanticSearch] Supabase init failed:', err);
    return false;
  }
}

export interface SearchResult {
  qa_id: string;
  question: string;
  answer: string;
  similarity: number;
  language?: string;
  category?: string;
}

export interface SearchOptions {
  minSimilarity?: number;
  maxResults?: number;
}

export function formatSearchResultsForContext(results: SearchResult[]): string {
  if (results.length === 0) return '';

  return results
    .map(r => `Q: ${r.question}\nA: ${r.answer}`)
    .join('\n---\n');
}

/**
 * Server-side semantic search using keyword fallback
 */
export async function semanticSearchServer(
  query: string,
  options: SearchOptions = {},
  clientEmbedding?: number[] | null
): Promise<SearchResult[]> {
  const { minSimilarity = 0.25, maxResults = 5 } = options;
  const startTime = performance.now();

  console.log('='.repeat(60));
  console.log('[🔍 SEMANTIC SEARCH] Starting search');
  console.log(`[🔍 SEMANTIC SEARCH] Query: "${query}"`);
  console.log(`[🔍 SEMANTIC SEARCH] Settings: minSimilarity=${minSimilarity}, maxResults=${maxResults}`);

  // Ensure Supabase is initialized
  if (!supabaseClient) {
    console.log('[🔍 SEMANTIC SEARCH] Initializing Supabase...');
    if (!initializeSupabaseSearch()) {
      console.error('[🔍 SEMANTIC SEARCH] ❌ Supabase initialization FAILED');
      throw new Error('Supabase not initialized');
    }
  }

  // Try to generate embedding if not provided
  if (!clientEmbedding || !Array.isArray(clientEmbedding) || clientEmbedding.length !== 384) {
    // Check if we have a cached embedding for this query
    const cachedEmbedding = getCachedEmbedding(query);
    if (cachedEmbedding) {
      clientEmbedding = cachedEmbedding;
      console.log('[🔍 SEMANTIC SEARCH] Using cached embedding');
    } else {
      // Try to generate embedding server-side using Hugging Face inference library
      try {
        console.log('[🔍 SEMANTIC SEARCH] Generating embedding server-side using Hugging Face...');
        console.log(`[🔍 SEMANTIC SEARCH] Query for embedding: "${query}"`);
        
        // Dynamically import the Hugging Face inference library
        const { HfInference } = await import('@huggingface/inference');
        
        // Use the HF_TOKEN environment variable
        const hfToken = process.env.HF_TOKEN;
        if (!hfToken) {
          throw new Error('HF_TOKEN environment variable not set');
        }
        
        const hf = new HfInference(hfToken);
        
        // Use feature extraction with the intfloat/multilingual-e5-small model
        const result = await hf.featureExtraction({
          model: 'intfloat/multilingual-e5-small',
          inputs: `query: ${query}`
        });
        
        // The result should be an array with the embedding
        if (!Array.isArray(result) || result.length === 0) {
          throw new Error('Invalid response from Hugging Face API');
        }
        
        // Extract the embedding vector and ensure it's a flat array of numbers
        let embedding: any = Array.isArray(result[0]) ? result[0] : result;
        
        // If it's still not a flat array of numbers, flatten it
        if (Array.isArray(embedding) && embedding.length > 0 && Array.isArray(embedding[0])) {
          embedding = embedding.flat();
        }
        
        // Cast to number array
        const embeddingArray: number[] = embedding as number[];
        
        // Validate embedding dimensions (should be 384 for intfloat/multilingual-e5-small)
        if (!Array.isArray(embeddingArray) || embeddingArray.length !== 384) {
          throw new Error(`Invalid embedding dimensions: ${embeddingArray.length}`);
        }
        
        clientEmbedding = embeddingArray;
        console.log('[🔍 SEMANTIC SEARCH] ✅ Generated 384-d embedding server-side using Hugging Face');
        
        // Cache the embedding for future use
        cacheEmbedding(query, embeddingArray);
      } catch (embeddingErr) {
        console.warn('[🔍 SEMANTIC SEARCH] ⚠️ Failed to generate embedding server-side:', embeddingErr);
      }
    }
  }
  
  // If we have an embedding (either from client or generated server-side), use vector search
  if (clientEmbedding && Array.isArray(clientEmbedding) && clientEmbedding.length === 384) {
    console.log('[🔍 SEMANTIC SEARCH] Using embedding for vector search');
    
    try {
      // Use RPC function for vector search
      const { data, error } = await supabaseClient
        .rpc('semantic_search_384', {
          query_embedding: clientEmbedding,
          similarity_threshold: minSimilarity,
          limit_results: maxResults
        });
      
      if (error) throw error;
      
      const results: SearchResult[] = (data || []).map((item: any) => ({
        qa_id: item.qa_id,
        question: item.question,
        answer: item.answer,
        similarity: item.similarity,
        language: item.language,
        category: item.category,
      }));
      
      const duration = performance.now() - startTime;
      console.log(`[🔍 SEMANTIC SEARCH] ✅ Found ${results.length} results in ${duration.toFixed(2)}ms`);
      console.log('='.repeat(60));
      return results;
      
    } catch (err) {
      console.error('[🔍 SEMANTIC SEARCH] ❌ Vector search failed:', err);
      // Fall back to keyword search
    }
  }
  
  // Use keyword search as fallback
  console.log('[🔍 SEMANTIC SEARCH] Using KEYWORD SEARCH as fallback');

  try {
    console.log(`[🔑 KEYWORD SEARCH] Starting keyword search for: "${query.substring(0, 50)}..."`);
    console.log(`[🔑 KEYWORD SEARCH] Querying Supabase qa_embeddings table...`);
    console.log(`[🔑 KEYWORD SEARCH] URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

    const kwStartTime = performance.now();
    
    // Fetch all records (we'll do client-side filtering)
    const { data, error, status, statusText } = await supabaseClient
      .from('qa_embeddings')
      .select('qa_id, question, answer, language, category')
      .limit(maxResults * 5); // Get more to filter

    if (error) {
      console.error(`[🔑 KEYWORD SEARCH] ❌ Supabase error (${status} ${statusText}):`, error);
      throw error;
    }

    console.log(`[🔑 KEYWORD SEARCH] ✓ Query returned ${data?.length || 0} records (status: ${status})`);

    if (!data || data.length === 0) {
      const kwDuration = performance.now() - kwStartTime;
      console.log(`[🔑 KEYWORD SEARCH] ℹ️  No records found in table`);
      console.log(`[🔑 KEYWORD SEARCH] ⏱️  Duration: ${kwDuration.toFixed(2)}ms`);
      console.log('[🔑 KEYWORD SEARCH] HINT: Check if table qa_embeddings has data and credentials are correct');
      console.log('='.repeat(60));
      return [];
    }

    // Simple keyword matching
    const results: SearchResult[] = [];
    const queryWords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    
    for (const row of data) {
      const questionLower = (row.question || '').toLowerCase();
      const answerLower = (row.answer || '').toLowerCase();
      const combined = `${questionLower} ${answerLower}`;
      
      // Count matching words
      const matches = queryWords.filter(word => combined.includes(word)).length;
      
      if (matches > 0) {
        // Calculate similarity score
        const similarity = Math.min(matches / queryWords.length, 1.0);
        
        if (similarity >= minSimilarity) {
          results.push({
            qa_id: row.qa_id,
            question: row.question,
            answer: row.answer,
            similarity: similarity,
            language: row.language,
            category: row.category,
          });
        }
      }
    }

    // Sort by similarity and limit
    results.sort((a, b) => b.similarity - a.similarity);
    const finalResults = results.slice(0, maxResults);

    const kwDuration = performance.now() - kwStartTime;
    
    if (finalResults.length > 0) {
      console.log(`[🔑 KEYWORD SEARCH] ✅ Found ${finalResults.length} keyword matches:`);
      finalResults.forEach((r, i) => {
        console.log(`  [${i + 1}] "${r.question.substring(0, 50)}..." (score: ${(r.similarity * 100).toFixed(0)}%)`);
      });
    } else {
      console.log(`[🔑 KEYWORD SEARCH] ℹ️  No keyword matches found`);
    }
    
    console.log(`[🔑 KEYWORD SEARCH] ⏱️  Duration: ${kwDuration.toFixed(2)}ms`);
    console.log('='.repeat(60));

    return finalResults;
  } catch (err) {
    console.error('[🔍 SEMANTIC SEARCH] ❌ Search error:', err);
    console.log('='.repeat(60));
    throw err;
  }
}
