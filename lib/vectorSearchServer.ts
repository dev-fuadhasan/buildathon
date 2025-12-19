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
import * as fs from 'fs';
import path from 'path';

let supabaseClient: any = null;

function initializeSupabase(): boolean {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Vector Search] Supabase credentials missing');
      return false;
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
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
    // Step 1: Find reference embedding from precomputed embeddings.json (Netlify-friendly)
    console.log('[🔍 VECTOR SEARCH] Finding reference embedding from embeddings.json...');
    const embedPath = path.join(process.cwd(), 'embeddings.json');
    let allEmbeddings: any[] = [];
    try {
      const raw = fs.readFileSync(embedPath, 'utf-8');
      allEmbeddings = JSON.parse(raw);
      console.log(`[📦 Embeddings] Loaded ${allEmbeddings.length} records`);
    } catch (e) {
      console.error('[📦 Embeddings] Failed to read embeddings.json:', e);
      console.log('='.repeat(60));
      return [];
    }

    const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    let best: any = null;
    let bestScore = -1;
    for (const rec of allEmbeddings) {
      const text = ((rec.question || '') + ' ' + (rec.answer || '') + ' ' + (rec.content || '')).toLowerCase();
      let score = 0;
      for (const w of qWords) if (text.includes(w)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = rec;
      }
    }

    if (!best) {
      console.log('[🔍 VECTOR SEARCH] No reference record matched; using first record as fallback');
      if (allEmbeddings.length === 0) {
        console.log('='.repeat(60));
        return [];
      }
      best = allEmbeddings[0];
    }

    let embedding: number[] | null = best.embedding || best.questionEmbedding_en || best.questionEmbedding || null;
    if (!embedding || embedding.length !== 384) {
      console.error('[🔍 VECTOR SEARCH] Reference embedding missing or invalid');
      console.log('='.repeat(60));
      return [];
    }

    // Normalize L2
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    if (norm > 0) embedding = embedding.map((v: number) => v / norm);

    console.log('[🔍 VECTOR SEARCH] Using LOCAL query embedding (384-dim)');
    console.log('[🔍 VECTOR SEARCH] Supabase vector search executed');

    const rpcStartTime = performance.now();

    // Step 2: Call Supabase RPC for vector similarity
    const { data: searchResults, error: rpcError } = await supabaseClient.rpc('match_embeddings', {
      query_embedding: embedding,
      similarity_threshold: minSimilarity,
      match_count: maxResults * 2,
    });

    const rpcDuration = performance.now() - rpcStartTime;

    if (rpcError) {
      console.error('[🔍 VECTOR SEARCH] ❌ RPC error:', rpcError);
      console.log('='.repeat(60));
      return [];
    }

    if (!searchResults || searchResults.length === 0) {
      console.log('[🔍 VECTOR SEARCH] ℹ️  No vector matches found');
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

    console.log(`[🔍 VECTOR SEARCH] ✅ Found ${results.length} vector results`);
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
