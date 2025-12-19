'use client';

/**
 * VECTOR DATABASE CLIENT
 * ======================
 * 
 * Semantic search against pre-computed embeddings in vector DB.
 * Supports: Supabase, Qdrant, Pinecone
 * 
 * NO ML models. NO WASM. Just vector similarity search.
 */

import { embedQuery } from './queryEmbedding';

export interface QARecord {
  qa_id: string;
  question: string;
  answer: string;
  language?: string;
  severity?: string;
  trimester?: number;
  category?: string;
  source?: string;
}

export interface SearchResult {
  qa_id: string;
  question: string;
  answer: string;
  similarity: number;
  language?: string;
  severity?: string;
  trimester?: number;
  category?: string;
}

export interface SearchOptions {
  minSimilarity?: number;
  maxResults?: number;
  language?: string;
  severity?: string;
  timeout?: number;
}

// ============================================================================
// VECTOR DATABASE IMPLEMENTATIONS
// ============================================================================

/**
 * SUPABASE VECTOR (pgvector)
 */
class SupabaseVectorDB {
  private url: string;
  private key: string;
  private tableName = 'qa_embeddings';

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
  }

  async search(embedding: number[], options: SearchOptions): Promise<SearchResult[]> {
    const {
      minSimilarity = 0.3,
      maxResults = 5,
      language,
      severity,
    } = options;

    try {
      // Call Supabase RPC function
      const params = new URLSearchParams();
      params.append('query_embedding', JSON.stringify(embedding));
      params.append('similarity_threshold', minSimilarity.toString());
      params.append('limit_results', maxResults.toString());
      if (language) params.append('filter_language', language);
      if (severity) params.append('filter_severity', severity);

      const response = await fetch(
        `${this.url}/rest/v1/rpc/semantic_search?${params}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.key}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Supabase error: ${response.statusText}`);
      }

      const results = await response.json();
      return results.map((item: any) => ({
        qa_id: item.qa_id,
        question: item.question,
        answer: item.answer,
        similarity: item.similarity,
        language: item.language,
        severity: item.severity,
        trimester: item.trimester,
        category: item.category,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[VectorDB] Supabase search error:', errorMsg);
      throw err;
    }
  }
}

/**
 * QDRANT VECTOR DATABASE
 */
class QdrantVectorDB {
  private url: string;
  private apiKey: string;
  private collectionName = 'momcare_qa';

  constructor(url: string, apiKey: string) {
    this.url = url;
    this.apiKey = apiKey;
  }

  async search(embedding: number[], options: SearchOptions): Promise<SearchResult[]> {
    const {
      minSimilarity = 0.3,
      maxResults = 5,
      language,
      severity,
    } = options;

    try {
      // Build filter conditions
      const mustConditions: any[] = [];
      if (language) {
        mustConditions.push({
          key: 'language',
          match: { value: language },
        });
      }
      if (severity) {
        mustConditions.push({
          key: 'severity',
          match: { value: severity },
        });
      }

      const response = await fetch(`${this.url}/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: embedding,
          limit: maxResults,
          score_threshold: minSimilarity,
          with_payload: true,
          filter: mustConditions.length > 0 ? { must: mustConditions } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Qdrant error: ${response.statusText}`);
      }

      const data = await response.json();

      return (data.result || []).map((item: any) => ({
        qa_id: item.payload.qa_id,
        question: item.payload.question,
        answer: item.payload.answer,
        similarity: item.score,
        language: item.payload.language,
        severity: item.payload.severity,
        trimester: item.payload.trimester,
        category: item.payload.category,
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[VectorDB] Qdrant search error:', errorMsg);
      throw err;
    }
  }
}

/**
 * PINECONE VECTOR DATABASE
 */
class PineconeVectorDB {
  private indexName: string;
  private host: string;
  private apiKey: string;

  constructor(host: string, apiKey: string, indexName: string = 'momcare-qa') {
    this.host = host;
    this.apiKey = apiKey;
    this.indexName = indexName;
  }

  async search(embedding: number[], options: SearchOptions): Promise<SearchResult[]> {
    const {
      minSimilarity = 0.3,
      maxResults = 5,
    } = options;

    try {
      const response = await fetch(
        `https://${this.host}/query`,
        {
          method: 'POST',
          headers: {
            'Api-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            namespace: '',
            topK: maxResults,
            includeValues: false,
            includeMetadata: true,
            vector: embedding,
            filter: {
              score: { $gte: minSimilarity },
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Pinecone error: ${response.statusText}`);
      }

      const data = await response.json();

      return (data.matches || [])
        .filter((match: any) => match.score >= minSimilarity)
        .map((match: any) => ({
          qa_id: match.metadata?.qa_id || match.id,
          question: match.metadata?.question || '',
          answer: match.metadata?.answer || '',
          similarity: match.score,
          language: match.metadata?.language,
          severity: match.metadata?.severity,
          trimester: match.metadata?.trimester,
          category: match.metadata?.category,
        }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[VectorDB] Pinecone search error:', errorMsg);
      throw err;
    }
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

let vectorDB: SupabaseVectorDB | QdrantVectorDB | PineconeVectorDB | null = null;

/**
 * Initialize vector database connection
 */
export function initializeVectorDB(): boolean {
  const dbType = process.env.NEXT_PUBLIC_VECTOR_DB_TYPE || process.env.VECTOR_DB_TYPE;

  if (!dbType) {
    console.error('[VectorDB] VECTOR_DB_TYPE not set');
    return false;
  }

  try {
    if (dbType === 'supabase') {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!url || !key) {
        throw new Error('Supabase credentials not found');
      }

      vectorDB = new SupabaseVectorDB(url, key);
      console.log('[VectorDB] ✓ Supabase initialized');
    } else if (dbType === 'qdrant') {
      const url = process.env.NEXT_PUBLIC_QDRANT_URL || process.env.QDRANT_URL;
      const apiKey = process.env.NEXT_PUBLIC_QDRANT_API_KEY || process.env.QDRANT_API_KEY;

      if (!url || !apiKey) {
        throw new Error('Qdrant credentials not found');
      }

      vectorDB = new QdrantVectorDB(url, apiKey);
      console.log('[VectorDB] ✓ Qdrant initialized');
    } else if (dbType === 'pinecone') {
      const host = process.env.NEXT_PUBLIC_PINECONE_HOST || process.env.PINECONE_HOST;
      const apiKey = process.env.NEXT_PUBLIC_PINECONE_API_KEY || process.env.PINECONE_API_KEY;

      if (!host || !apiKey) {
        throw new Error('Pinecone credentials not found');
      }

      vectorDB = new PineconeVectorDB(host, apiKey);
      console.log('[VectorDB] ✓ Pinecone initialized');
    } else {
      throw new Error(`Unknown vector DB type: ${dbType}`);
    }

    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[VectorDB] Initialization failed: ${errorMsg}`);
    return false;
  }
}

/**
 * Search for similar Q&A pairs using semantic similarity
 * 
 * 1. Embeds user query (lightweight API call)
 * 2. Searches vector DB
 * 3. Returns top K results with similarity scores
 */
export async function semanticSearch(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  console.log('[VectorDB] Semantic search...');

  if (!vectorDB) {
    console.warn('[VectorDB] Database not initialized, initializing...');
    if (!initializeVectorDB()) {
      throw new Error('Vector database initialization failed');
    }
  }

  // Embed the query
  const embeddingResult = await embedQuery(query);

  if (!embeddingResult.success || !embeddingResult.embedding) {
    console.error('[VectorDB] Query embedding failed, cannot search');
    throw new Error(embeddingResult.error || 'Embedding failed');
  }

  // Search vector DB (guaranteed to exist after initialization check)
  if (!vectorDB) {
    throw new Error('Vector database still not initialized');
  }
  const results = await vectorDB.search(embeddingResult.embedding, options);

  console.log(`[VectorDB] Found ${results.length} results`);
  return results;
}

/**
 * Fallback keyword search (if embeddings unavailable)
 * Uses simple text matching
 */
export function keywordSearch(
  query: string,
  database: QARecord[],
  maxResults: number = 5
): SearchResult[] {
  console.log('[VectorDB] Fallback: keyword search...');

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  const scored = database.map(item => {
    const questionLower = item.question.toLowerCase();
    const answerLower = item.answer.toLowerCase();
    const combined = `${questionLower} ${answerLower}`;

    // Count word matches
    let matches = 0;
    for (const word of queryWords) {
      if (combined.includes(word)) {
        matches++;
      }
    }

    return {
      item,
      score: matches,
    };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(s => ({
      ...s.item,
      similarity: s.score / queryWords.length, // Normalize to 0-1
    }));
}

/**
 * Hybrid search: Try semantic first, fallback to keyword
 */
export async function hybridSearch(
  query: string,
  localDatabase: QARecord[],
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  console.log('[VectorDB] Hybrid search (semantic + fallback)...');

  try {
    // Try semantic search first
    return await semanticSearch(query, options);
  } catch (err) {
    console.warn('[VectorDB] Semantic search failed, using keyword fallback:', err);

    // Fallback to keyword search
    return keywordSearch(query, localDatabase, options.maxResults || 5);
  }
}

/**
 * Get search statistics for monitoring
 */
export interface SearchStats {
  timestamp: string;
  query: string;
  resultCount: number;
  avgSimilarity: number;
  method: 'semantic' | 'keyword';
  duration: number;
}

export async function searchWithStats(
  query: string,
  localDatabase: QARecord[] = [],
  options: SearchOptions = {}
): Promise<{ results: SearchResult[]; stats: SearchStats }> {
  const startTime = performance.now();

  try {
    const results = await hybridSearch(query, localDatabase, options);
    const duration = performance.now() - startTime;
    const avgSimilarity = results.length > 0
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      : 0;

    return {
      results,
      stats: {
        timestamp: new Date().toISOString(),
        query,
        resultCount: results.length,
        avgSimilarity,
        method: 'semantic',
        duration,
      },
    };
  } catch (err) {
    console.error('[VectorDB] Search error:', err);
    throw err;
  }
}
