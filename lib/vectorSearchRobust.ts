/**
 * ROBUST VECTOR SEARCH FOR VERCEL DEPLOYMENT
 * =========================================
 * 
 * This implementation ensures vector search works reliably in Vercel serverless environments
 * by using multiple fallback strategies:
 * 
 * 1. Client-provided embeddings (when available)
 * 2. External embedding service (when configured)
 * 3. Keyword search fallback (always available)
 */

import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '@/lib/huggingfaceEmbedding';

// Supabase client initialization
let supabaseClient: any = null;

function initializeSupabase(): boolean {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Robust Vector Search] Supabase credentials missing');
      return false;
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('[Robust Vector Search] ✓ Supabase initialized');
    return true;
  } catch (err) {
    console.error('[Robust Vector Search] Supabase init failed:', err);
    return false;
  }
}

// Result interface
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

    const { data, error } = await supabaseClient
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
 * Simple cosine similarity calculation for fallback scenarios
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Generate embedding using external service
 */
async function generateEmbeddingFromService(text: string): Promise<number[] | null> {
  try {
    // First, try to use the configured external embedding service
    const embeddingServiceUrl = process.env.EMBEDDING_SERVICE_URL;
    if (embeddingServiceUrl) {
      console.log('[Embedding Service] Using configured external service');
      const response = await fetch(embeddingServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EMBEDDING_SERVICE_KEY ? { 
            'Authorization': `Bearer ${process.env.EMBEDDING_SERVICE_KEY}` 
          } : {}),
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Embedding service error: ${response.status}`);
      }

      const result = await response.json();
      const embedding = result.embedding || result.data?.embedding || null;

      if (Array.isArray(embedding) && embedding.length === 384) {
        return embedding;
      } else {
        throw new Error('Invalid embedding format from service');
      }
    }
    
    // Fallback to Hugging Face if no external service is configured
    console.log('[Embedding Service] No external service configured, trying Hugging Face');
    const hfToken = process.env.HF_TOKEN;
    if (hfToken) {
      try {
        const embedding = await generateEmbedding(text);
        if (Array.isArray(embedding) && embedding.length === 384) {
          return embedding;
        } else {
          throw new Error('Invalid embedding format from Hugging Face');
        }
      } catch (hfError) {
        console.error('[Embedding Service] Hugging Face embedding failed:', hfError);
        throw hfError;
      }
    } else {
      console.warn('[Embedding Service] No HF_TOKEN configured');
      return null;
    }
  } catch (error) {
    console.error('[Embedding Service] Failed to generate embedding:', error);
    return null;
  }
}

/**
 * Robust vector search with multiple fallbacks
 * This is the main function that ensures vector search works in all environments
 */
export async function robustVectorSearch(
  query: string,
  options: SearchOptions = {},
  clientEmbedding?: number[]
): Promise<VectorSearchResult[]> {
  const { minSimilarity = 0.25, maxResults = 5 } = options;
  const startTime = Date.now();

  console.log('='.repeat(60));
  console.log('[🔍 ROBUST VECTOR SEARCH] Starting search');
  console.log(`[🔍 ROBUST VECTOR SEARCH] Query: "${query.substring(0, 60)}..."`);
  console.log(`[🔍 ROBUST VECTOR SEARCH] Settings: minSimilarity=${minSimilarity}, maxResults=${maxResults}`);

  // Initialize Supabase if needed
  if (!supabaseClient) {
    console.log('[🔍 ROBUST VECTOR SEARCH] Initializing Supabase...');
    if (!initializeSupabase()) {
      console.error('[🔍 ROBUST VECTOR SEARCH] ❌ Supabase init failed');
      console.log('[🔍 ROBUST VECTOR SEARCH] Falling back to keyword search');
      console.log('='.repeat(60));
      return await keywordSearch(query, maxResults);
    }
  }

  try {
    const q = query.trim();
    if (q.length === 0) {
      console.log('[🔍 ROBUST VECTOR SEARCH] Empty query; returning empty results');
      console.log('='.repeat(60));
      return [];
    }

    // Strategy 1: Use client-provided embedding if available
    let embeddingArray: number[] | undefined = undefined;
    if (clientEmbedding && Array.isArray(clientEmbedding) && clientEmbedding.length === 384) {
      embeddingArray = clientEmbedding.map(v => Number(v));
      console.log('[ROBUST VECTOR SEARCH] Using client-provided embedding (384-d)');
    } else {
      // Strategy 2: Generate embedding using external service
      console.log('[ROBUST VECTOR SEARCH] No client embedding; trying external service');
      const serviceEmbedding = await generateEmbeddingFromService(q);
      
      if (serviceEmbedding && Array.isArray(serviceEmbedding) && serviceEmbedding.length === 384) {
        embeddingArray = serviceEmbedding;
        console.log('[ROBUST VECTOR SEARCH] External service embedding generated successfully (384-d)');
      } else {
        console.log('[ROBUST VECTOR SEARCH] External service failed; falling back to keyword search');
        console.log('='.repeat(60));
        return await keywordSearch(query, maxResults);
      }
    }

    // Perform vector search using Supabase RPC
    console.log('[ROBUST VECTOR SEARCH] Calling match_embeddings RPC');
    const rpcStartTime = Date.now();

    const { data: searchResults, error: rpcError } = await supabaseClient.rpc('match_embeddings', {
      query_embedding: embeddingArray,
      similarity_threshold: minSimilarity,
      match_count: maxResults * 2,
    });

    console.log(`[🔍 ROBUST VECTOR SEARCH] match_embeddings RPC returned ${Array.isArray(searchResults) ? searchResults.length : 0} rows`);

    const rpcDuration = Date.now() - rpcStartTime;

    if (rpcError) {
      console.error('[🔍 ROBUST VECTOR SEARCH] ❌ RPC error:', rpcError);
      console.log('[🔍 ROBUST VECTOR SEARCH] Falling back to keyword search due to RPC error');
      console.log('='.repeat(60));
      return await keywordSearch(query, maxResults);
    }

    if (!searchResults || searchResults.length === 0) {
      console.log('⚠️ Vector search returned no matches');
      console.log('[🔍 ROBUST VECTOR SEARCH] Trying keyword search as additional fallback');
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
    console.log(`[🔍 ROBUST VECTOR SEARCH] ⏱️  Duration: ${totalDuration}ms (RPC: ${rpcDuration}ms)`);
    console.log('='.repeat(60));

    return results;
  } catch (err) {
    console.error('[🔍 ROBUST VECTOR SEARCH] ❌ Vector search failed:', err);
    console.log('[🔍 ROBUST VECTOR SEARCH] Final fallback to keyword search');
    console.log('='.repeat(60));
    return await keywordSearch(query, maxResults);
  }
}

/**
 * Lightweight keyword-based vector search for environments where embeddings aren't available
 * This creates a pseudo-vector search using TF-IDF-like scoring
 */
export async function lightweightVectorSearch(
  query: string,
  options: SearchOptions = {}
): Promise<VectorSearchResult[]> {
  const { maxResults = 5 } = options;
  
  if (!supabaseClient) {
    if (!initializeSupabase()) {
      console.error('[Lightweight Search] Supabase init failed');
      return [];
    }
  }

  try {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    // Fetch all QA pairs (in production, you might want to limit this)
    const { data, error } = await supabaseClient
      .from('qa_embeddings')
      .select('qa_id, question, answer, language, category');

    if (error) {
      console.error('[Lightweight Search] ❌ Supabase error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Simple keyword matching with scoring
    const queryWords = q.split(/\s+/).filter(word => word.length > 2);
    
    const scoredResults = data.map((item: any) => {
      const question = (item.question || '').toLowerCase();
      const answer = (item.answer || '').toLowerCase();
      
      let score = 0;
      
      // Score based on query word matches
      for (const word of queryWords) {
        if (question.includes(word)) score += 2;
        if (answer.includes(word)) score += 1;
      }
      
      // Normalize score
      const maxPossibleScore = queryWords.length * 2;
      const normalizedScore = maxPossibleScore > 0 ? score / maxPossibleScore : 0;
      
      return {
        ...item,
        similarity: normalizedScore,
      };
    });
    
    // Filter and sort by score
    const filteredResults = scoredResults
      .filter((item: any) => item.similarity > 0.1)
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, maxResults);
    
    // Format results
    const results: VectorSearchResult[] = filteredResults.map((item: any) => ({
      qa_id: item.qa_id,
      question: item.question,
      answer: item.answer,
      similarity: item.similarity,
      language: item.language,
      category: item.category,
    }));
    
    console.log(`[Lightweight Search] Found ${results.length} results using keyword matching`);
    
    return results;
  } catch (err) {
    console.error('[Lightweight Search] Error:', err);
    return [];
  }
}