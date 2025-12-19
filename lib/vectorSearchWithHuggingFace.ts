/**
 * VECTOR SEARCH WITH HUGGING FACE EMBEDDINGS
 * ========================================
 * 
 * This module provides a robust vector search implementation that uses
 * Hugging Face embeddings as the primary method for generating embeddings.
 * It's designed to work reliably in Vercel deployments.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding } from './huggingfaceEmbedding';

// Supabase client (will be initialized on first use)
let supabaseClient: SupabaseClient<any, "public", any> | null = null;

// Initialize Supabase client
function initializeSupabase(): boolean {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Supabase] Missing environment variables');
      return false;
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log('[Supabase] Client initialized successfully');
    return true;
  } catch (error) {
    console.error('[Supabase] Failed to initialize client:', error);
    return false;
  }
}

// Vector search result interface
export interface VectorSearchResult {
  qa_id: string;
  question: string;
  answer: string;
  similarity: number;
  language?: string;
  category?: string;
}

// Search options
export interface SearchOptions {
  minSimilarity?: number;
  maxResults?: number;
}

/**
 * Fallback keyword search (simple ilike on question/answer)
 */
async function keywordSearch(query: string, maxResults: number = 5): Promise<VectorSearchResult[]> {
  if (!supabaseClient) {
    if (!initializeSupabase()) {
      console.error('[Keyword Search] Supabase init failed');
      return [];
    }
  }

  try {
    const q = query.trim();
    if (q.length === 0) return [];

    const { data, error } = await supabaseClient!
      .from('qa_embeddings')
      .select('qa_id, question, answer, language, category')
      .or(`question.ilike.%${q}%,answer.ilike.%${q}%`)
      .limit(maxResults);

    if (error) {
      console.error('[Keyword Search] ❌ Supabase error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any) => ({
      qa_id: row.qa_id,
      question: row.question,
      answer: row.answer,
      similarity: 0.5, // Default similarity for keyword matches
      language: row.language,
      category: row.category,
    }));
  } catch (err) {
    console.error('[Keyword Search] Error:', err);
    return [];
  }
}

/**
 * Main vector search function using Hugging Face embeddings
 */
export async function vectorSearchWithHuggingFace(
  query: string,
  options: SearchOptions = {}
): Promise<VectorSearchResult[]> {
  const { minSimilarity = 0.25, maxResults = 5 } = options;
  const startTime = Date.now();

  console.log('='.repeat(60));
  console.log('[🔍 HUGGING FACE VECTOR SEARCH] Starting search');
  console.log(`[🔍 HUGGING FACE VECTOR SEARCH] Query: "${query.substring(0, 60)}..."`);
  console.log(`[🔍 HUGGING FACE VECTOR SEARCH] Settings: minSimilarity=${minSimilarity}, maxResults=${maxResults}`);

  // Initialize Supabase if needed
  if (!supabaseClient) {
    console.log('[🔍 HUGGING FACE VECTOR SEARCH] Initializing Supabase...');
    if (!initializeSupabase()) {
      console.error('[🔍 HUGGING FACE VECTOR SEARCH] ❌ Supabase init failed');
      console.log('[🔍 HUGGING FACE VECTOR SEARCH] Falling back to keyword search');
      console.log('='.repeat(60));
      return await keywordSearch(query, maxResults);
    }
  }

  try {
    const q = query.trim();
    if (q.length === 0) {
      console.log('[🔍 HUGGING FACE VECTOR SEARCH] Empty query; returning empty results');
      console.log('='.repeat(60));
      return [];
    }

    // Generate embedding using Hugging Face
    console.log('[🔍 HUGGING FACE VECTOR SEARCH] Generating embedding with Hugging Face...');
    let embeddingArray: number[];
    
    try {
      const embedding = await generateEmbedding(q);
      if (Array.isArray(embedding) && embedding.length === 384) {
        embeddingArray = embedding;
        console.log('[🔍 HUGGING FACE VECTOR SEARCH] Embedding generated successfully (384-d)');
      } else {
        throw new Error('Invalid embedding format from Hugging Face');
      }
    } catch (embeddingError) {
      console.error('[🔍 HUGGING FACE VECTOR SEARCH] ❌ Failed to generate embedding:', embeddingError);
      console.log('[🔍 HUGGING FACE VECTOR SEARCH] Falling back to keyword search');
      console.log('='.repeat(60));
      return await keywordSearch(query, maxResults);
    }

    // Perform vector search using Supabase RPC
    console.log('[🔍 HUGGING FACE VECTOR SEARCH] Calling match_embeddings RPC');
    const rpcStartTime = Date.now();

    const { data: searchResults, error: rpcError } = await supabaseClient!.rpc('match_embeddings', {
      query_embedding: embeddingArray,
      similarity_threshold: minSimilarity,
      match_count: maxResults * 2,
    } as any);

    console.log(`[🔍 HUGGING FACE VECTOR SEARCH] match_embeddings RPC returned ${Array.isArray(searchResults) ? searchResults.length : 0} rows`);

    const rpcDuration = Date.now() - rpcStartTime;

    if (rpcError) {
      console.error('[🔍 HUGGING FACE VECTOR SEARCH] ❌ RPC error:', rpcError);
      console.log('[🔍 HUGGING FACE VECTOR SEARCH] Falling back to keyword search due to RPC error');
      console.log('='.repeat(60));
      return await keywordSearch(query, maxResults);
    }

    if (!searchResults || searchResults.length === 0) {
      console.log('⚠️ Vector search returned no matches');
      console.log('[🔍 HUGGING FACE VECTOR SEARCH] Trying keyword search as additional fallback');
      const keywordResults = await keywordSearch(query, maxResults);
      console.log('='.repeat(60));
      return keywordResults;
    }

    // Format results
    const results: VectorSearchResult[] = searchResults
      .slice(0, maxResults)
      .map((item: any) => ({
        qa_id: item.qa_id,
        question: item.question,
        answer: item.answer,
        similarity: item.similarity,
        language: item.language,
        category: item.category,
      }));

    console.log(`✅ Vector search returned ${results.length} results`);
    results.forEach((r: VectorSearchResult, i: number) => {
      console.log(`  [${i + 1}] "${r.question.substring(0, 50)}..." (similarity: ${(r.similarity * 100).toFixed(0)}%)`);
    });

    const totalDuration = Date.now() - startTime;
    console.log(`[🔍 HUGGING FACE VECTOR SEARCH] ⏱️  Duration: ${totalDuration}ms (RPC: ${rpcDuration}ms)`);
    console.log('='.repeat(60));

    return results;
  } catch (err) {
    console.error('[🔍 HUGGING FACE VECTOR SEARCH] ❌ Vector search failed:', err);
    console.log('[🔍 HUGGING FACE VECTOR SEARCH] Final fallback to keyword search');
    console.log('='.repeat(60));
    return await keywordSearch(query, maxResults);
  }
}