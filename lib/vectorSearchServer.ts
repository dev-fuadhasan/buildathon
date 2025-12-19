/**
 * SUPABASE VECTOR SIMILARITY SEARCH (Real Vector Search)
 * =====================================================
 * 
 * Uses Supabase RPC: match_embeddings() with pre-computed embeddings
 * Strategy:
 * 1. Load embeddings.json (on first run, cached)
 * 2. Find best matching record from pre-computed embeddings
 * 3. Use its embedding to call Supabase RPC for vector similarity
 * 4. Return results ranked by cosine similarity
 */

import { createClient } from '@supabase/supabase-js';
// Reference-embedding approach: use a representative row's embedding from Supabase

let supabaseClient: any = null;

function initializeSupabase(): boolean {
  try {
    // Prefer service role key on server; fall back to public anon key
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Vector Search] Supabase credentials missing');
      return false;
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('[Vector Search] ✓ Supabase initialized');
    return true;
  } catch (err) {
    console.error('[Vector Search] Supabase init failed:', err);
    return false;
  }
}

// Embeddings are generated dynamically via the local Python helper

export interface VectorSearchResult {
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

/**
 * Fallback keyword search (simple ilike on question/answer)
 */
async function keywordSearch(query: string, maxResults: number = 5): Promise<VectorSearchResult[]> {
  if (!supabaseClient) {
    if (!initializeSupabase()) {
      console.error('[🔑 KEYWORD SEARCH] Supabase init failed');
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
      console.error('[🔑 KEYWORD SEARCH] ❌ Supabase error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any) => ({
      qa_id: row.qa_id,
      question: row.question,
      answer: row.answer,
      similarity: 0.5,
      language: row.language,
      category: row.category,
    }));
  } catch (err) {
    console.error('[🔑 KEYWORD SEARCH] Error:', err);
    return [];
  }
}

/**
 * REAL Vector Search using Supabase RPC
 */
export async function semanticSearchWithFallback(
  query: string,
  options: SearchOptions = {}
): Promise<VectorSearchResult[]> {
  const { minSimilarity = 0.25, maxResults = 5 } = options;
  const startTime = performance.now();

  console.log('='.repeat(60));
  console.log('[🔍 VECTOR SEARCH] Starting Supabase vector search');
  console.log(`[🔍 VECTOR SEARCH] Query: "${query.substring(0, 60)}..."`);
  console.log(`[🔍 VECTOR SEARCH] Settings: minSimilarity=${minSimilarity}, maxResults=${maxResults}`);

  if (!supabaseClient) {
    console.log('[🔍 VECTOR SEARCH] Initializing Supabase...');
    if (!initializeSupabase()) {
      console.error('[🔍 VECTOR SEARCH] ❌ Supabase init failed');
      console.log('='.repeat(60));
      return [];
    }
  }
  try {
    // Step 1: Generate query embedding via Edge WASM embedding endpoint
    console.log('[🔍 VECTOR SEARCH] Requesting WASM embedding from /api/embedding-384');
    const q = query.trim();
    if (q.length === 0) {
      console.log('[🔍 VECTOR SEARCH] Empty query; returning empty results');
      console.log('='.repeat(60));
      return [];
    }

    // Resolve base URL for internal request. Prefer VERCEL_URL for deployed environment.
    const baseHost = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_SITE_URL || `http://localhost:${process.env.PORT || 3000}`);
    let embedRes: Response;
    try {
      embedRes = await fetch(new URL('/api/embedding-384', baseHost).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q }),
      });
    } catch (err) {
      console.error('[🔍 VECTOR SEARCH] ❌ Failed to call embedding endpoint:', err);
      const fallback = await keywordSearch(query, maxResults);
      return fallback;
    }

    if (!embedRes.ok) {
      console.error('[🔍 VECTOR SEARCH] ❌ Embedding endpoint returned non-ok status:', embedRes.status);
      const fallback = await keywordSearch(query, maxResults);
      return fallback;
    }

    const embedJson = await embedRes.json();
    const embeddingArray = embedJson?.embedding;

    if (!embeddingArray || !Array.isArray(embeddingArray) || embeddingArray.length !== 384) {
      console.log('[🔍 VECTOR SEARCH] Embedding endpoint returned invalid embedding; falling back to keywordSearch');
      const fallback = await keywordSearch(query, maxResults);
      return fallback;
    }

    console.log('[VECTOR SEARCH] Query embedding generated (384-dim)');
    console.log('[VECTOR SEARCH] Calling match_embeddings RPC');
    const rpcStartTime = performance.now();

    const { data: searchResults, error: rpcError } = await supabaseClient.rpc('match_embeddings', {
      query_embedding: embeddingArray,
      similarity_threshold: minSimilarity,
      match_count: maxResults * 2,
    });

      console.log(`[🔍 VECTOR SEARCH] match_embeddings RPC returned ${Array.isArray(searchResults) ? searchResults.length : 0} rows`);

    const rpcDuration = performance.now() - rpcStartTime;

    if (rpcError) {
      console.error('[🔍 VECTOR SEARCH] ❌ RPC error:', rpcError);
      console.log('='.repeat(60));
      return [];
    }

    if (!searchResults || searchResults.length === 0) {
      console.log('⚠️ Vector search empty, using keyword fallback');
      console.log('='.repeat(60));
      // Fallback to keyword search (per spec)
      const fallback = await keywordSearch(query, maxResults);
      return fallback;
    }

    // Step 3: Format results
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

    const totalDuration = performance.now() - startTime;
    console.log(`[🔍 VECTOR SEARCH] ⏱️  Duration: ${totalDuration.toFixed(2)}ms (RPC: ${rpcDuration.toFixed(2)}ms)`);
    console.log('='.repeat(60));

    return results;
  } catch (err) {
    console.error('[🔍 VECTOR SEARCH] ❌ Vector search failed:', err);
    console.log('='.repeat(60));
    return [];
  }
}
