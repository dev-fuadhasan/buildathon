/**
 * SERVER-SIDE SUPABASE SEMANTIC SEARCH
 * ====================================
 * 
 * Used in API routes for server-side semantic search
 * without 'use client' directive
 */

import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

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
  options: SearchOptions = {}
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

  // Use keyword search (no query embedding needed)
  console.log('[🔍 SEMANTIC SEARCH] Query embedding disabled, using KEYWORD SEARCH');

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
