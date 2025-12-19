'use client';

/**
 * EXAMPLE: Client-Side Vector Search Component
 * 
 * This shows how to integrate client-side embeddings into your chat
 * Copy this pattern into your actual chat component
 * 
 * Features:
 * - Semantic search with client-side embeddings
 * - Loading state management
 * - Error handling with fallback
 * - Works offline after first load
 */

import { useEffect, useState, useCallback } from 'react';
import { useEmbedding } from '@/hooks/useEmbedding';
import { hybridSearch, loadEmbeddings, SearchMatch, SearchStats, searchWithStats } from '@/lib/vectorSearchClient';
import { setModelLoadTime } from '@/lib/vectorSearchClient';

interface QAPair {
  id: string;
  question: string;
  answer: string;
  embedding: number[];
}

export function ClientSideVectorSearchExample() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [qaDatabase, setQaDatabase] = useState<QAPair[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SearchStats | null>(null);

  const { isModelReady, isLoading: modelLoading, error: modelError } = useEmbedding();

  // Load Q&A database and embeddings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[Example] Loading Q&A database with embeddings...');
        const data = await loadEmbeddings();
        setQaDatabase(data);
        console.log('[Example] Loaded', data.length, 'Q&A pairs');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load embeddings';
        setError(message);
        console.error('[Example] Load error:', message);
      }
    };

    loadData();
  }, []);

  // Perform search when query changes
  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (!isModelReady) {
      setError('Model is still loading...');
      return;
    }

    if (qaDatabase.length === 0) {
      setError('Q&A database not loaded');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      console.log('[Example] Searching for:', query);

      // Option 1: Simple search
      // const searchResults = await hybridSearch(query, qaDatabase, 3);

      // Option 2: Search with statistics
      const { results: searchResults, stats: searchStats } = await searchWithStats(query, qaDatabase, 3);

      setResults(searchResults);
      setStats(searchStats);

      console.log('[Example] Found', searchResults.length, 'results');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      console.error('[Example] Search error:', message);
    } finally {
      setIsSearching(false);
    }
  }, [query, isModelReady, qaDatabase]);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div>
        <h2 className="text-xl font-bold mb-2">Client-Side Vector Search Demo</h2>

        {/* Status Section */}
        <div className="mb-4 p-3 bg-blue-50 rounded">
          <p className="text-sm">
            <strong>Model Status:</strong>{' '}
            {modelLoading ? (
              <span className="text-yellow-600">⏳ Loading...</span>
            ) : isModelReady ? (
              <span className="text-green-600">✓ Ready (all in browser)</span>
            ) : (
              <span className="text-red-600">✗ Not ready</span>
            )}
          </p>
          {modelError && <p className="text-red-600 text-sm">Error: {modelError.message}</p>}
        </div>

        {/* Search Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Ask a health question (English or Bangla)</label>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g., 'মাথাব্যথা সাধারণ কি?' or 'Is pregnancy nausea normal?'"
            className="w-full px-3 py-2 border rounded-lg"
            disabled={!isModelReady || modelLoading}
          />
          <button
            onClick={handleSearch}
            disabled={!isModelReady || isSearching || modelLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {isSearching ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Results Section */}
        {results.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">
              Found {results.length} Matching Q&A{results.length > 0 && ' (Best Matches)'}
            </h3>
            {results.map((result, index) => (
              <div key={result.id} className="p-3 bg-gray-50 rounded border-l-4 border-blue-400">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {index + 1}. <strong>Q:</strong> {result.question}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>A:</strong> {result.answer.substring(0, 150)}
                      {result.answer.length > 150 ? '...' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-green-600">
                      {(result.similarity * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-500">Match</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Display */}
        {stats && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs space-y-1">
            <p>
              <strong>Search Time:</strong> {stats.searchDuration.toFixed(1)}ms
            </p>
            <p>
              <strong>Avg Relevance:</strong> {(stats.avgSimilarity * 100).toFixed(0)}%
            </p>
            <p>
              <strong>Total Q&A Pairs:</strong> {stats.totalDocuments}
            </p>
            {stats.modelLoadTime > 0 && (
              <p>
                <strong>First Load Time:</strong> {stats.modelLoadTime.toFixed(0)}ms
              </p>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          <p className="font-semibold">✓ Completely Client-Side</p>
          <p className="text-xs mt-1">
            • Model runs in your browser (WebAssembly)<br />
            • No API keys needed<br />
            • Works offline after first load<br />
            • Your data stays in your browser<br />
            • Supports English, Bangla, Banglish
          </p>
        </div>
      </div>
    </div>
  );
}
