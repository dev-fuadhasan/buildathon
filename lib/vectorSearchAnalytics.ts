/**
 * Vector Search Analytics Tracking
 * Tracks usage statistics for vector search to show in admin dashboard
 */

import fs from 'fs';
import path from 'path';

export interface VectorSearchLog {
  timestamp: string;
  query: string;
  language: 'en' | 'bn';
  method: 'vector' | 'keyword' | 'hybrid';
  resultsCount: number;
  bestSimilarity?: number;
  searchTimeMs?: number;
  embeddingsLoaded: boolean;
}

const ANALYTICS_FILE = path.join(process.cwd(), 'vector-search-analytics.json');
const MAX_LOGS = 10000; // Keep last 10,000 searches

// Check if we're in a serverless environment (read-only file system)
const isServerless = process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME;

let analyticsCache: VectorSearchLog[] | null = null;
let inMemoryLogs: VectorSearchLog[] = []; // Fallback for serverless

/**
 * Load analytics from file or memory
 */
function loadAnalytics(): VectorSearchLog[] {
  if (analyticsCache) {
    return analyticsCache;
  }

  // In serverless, use in-memory storage
  if (isServerless) {
    return inMemoryLogs;
  }

  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const content = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
      analyticsCache = JSON.parse(content);
      return analyticsCache || [];
    }
  } catch (error) {
    console.error('[Vector Analytics] Error loading analytics:', error);
  }

  return [];
}

/**
 * Save analytics to file or memory
 */
function saveAnalytics(logs: VectorSearchLog[]): void {
  try {
    // Keep only last MAX_LOGS entries
    const trimmedLogs = logs.slice(-MAX_LOGS);
    
    // In serverless, use in-memory storage
    if (isServerless) {
      inMemoryLogs = trimmedLogs;
      analyticsCache = trimmedLogs;
      return;
    }

    // Try to write to file system
    try {
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(trimmedLogs, null, 2), 'utf-8');
      analyticsCache = trimmedLogs;
    } catch (writeError: any) {
      // If file system is read-only, fall back to in-memory
      if (writeError.code === 'EROFS' || writeError.code === 'EACCES') {
        console.warn('[Vector Analytics] File system is read-only, using in-memory storage');
        inMemoryLogs = trimmedLogs;
        analyticsCache = trimmedLogs;
      } else {
        throw writeError;
      }
    }
  } catch (error) {
    console.error('[Vector Analytics] Error saving analytics:', error);
    // Fall back to in-memory storage
    const trimmedLogs = logs.slice(-MAX_LOGS);
    inMemoryLogs = trimmedLogs;
    analyticsCache = trimmedLogs;
  }
}

/**
 * Log a vector search event
 */
export function logVectorSearch(log: Omit<VectorSearchLog, 'timestamp'>): void {
  try {
    const logs = loadAnalytics();
    const newLog: VectorSearchLog = {
      ...log,
      timestamp: new Date().toISOString(),
    };
    logs.push(newLog);
    saveAnalytics(logs);
  } catch (error) {
    console.error('[Vector Analytics] Error logging search:', error);
  }
}

/**
 * Get analytics statistics
 */
export function getVectorSearchAnalytics(): {
  totalSearches: number;
  vectorSearches: number;
  keywordSearches: number;
  hybridSearches: number;
  vectorSearchPercentage: number;
  averageSimilarity: number;
  averageSearchTime: number;
  totalEmbeddings: number;
  embeddingsLoaded: boolean;
  searchesByLanguage: { en: number; bn: number };
  similarityDistribution: {
    high: number; // > 0.7
    medium: number; // 0.4 - 0.7
    low: number; // < 0.4
  };
  recentSearches: VectorSearchLog[];
  topQueries: Array<{ query: string; count: number }>;
} {
  const logs = loadAnalytics();
  const vectorLogs = logs.filter(l => l.method === 'vector' || l.method === 'hybrid');
  const keywordLogs = logs.filter(l => l.method === 'keyword');
  const hybridLogs = logs.filter(l => l.method === 'hybrid');

  // Calculate statistics
  const totalSearches = logs.length;
  const vectorSearches = vectorLogs.length;
  const keywordSearches = keywordLogs.length;
  const hybridSearches = hybridLogs.length;

  // Average similarity (only for vector searches)
  const similarities = vectorLogs
    .filter(l => l.bestSimilarity !== undefined)
    .map(l => l.bestSimilarity!);
  const averageSimilarity = similarities.length > 0
    ? similarities.reduce((a, b) => a + b, 0) / similarities.length
    : 0;

  // Average search time
  const searchTimes = logs
    .filter(l => l.searchTimeMs !== undefined)
    .map(l => l.searchTimeMs!);
  const averageSearchTime = searchTimes.length > 0
    ? searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length
    : 0;

  // Language distribution
  const searchesByLanguage = {
    en: logs.filter(l => l.language === 'en').length,
    bn: logs.filter(l => l.language === 'bn').length,
  };

  // Similarity distribution
  const similarityDistribution = {
    high: similarities.filter(s => s > 0.7).length,
    medium: similarities.filter(s => s >= 0.4 && s <= 0.7).length,
    low: similarities.filter(s => s < 0.4).length,
  };

  // Check if embeddings are loaded
  const embeddingsLoaded = logs.length > 0 ? logs[logs.length - 1].embeddingsLoaded : false;

  // Get total embeddings count
  const { hasEmbeddings } = require('./vectorSearch');
  const totalEmbeddings = hasEmbeddings() ? 677 : 0; // Hardcoded for now, can be dynamic

  // Recent searches (last 50)
  const recentSearches = logs.slice(-50).reverse();

  // Top queries (most searched)
  const queryCounts: Record<string, number> = {};
  logs.forEach(log => {
    const normalizedQuery = log.query.toLowerCase().trim();
    queryCounts[normalizedQuery] = (queryCounts[normalizedQuery] || 0) + 1;
  });
  const topQueries = Object.entries(queryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  return {
    totalSearches,
    vectorSearches,
    keywordSearches,
    hybridSearches,
    vectorSearchPercentage: totalSearches > 0 ? (vectorSearches / totalSearches) * 100 : 0,
    averageSimilarity,
    averageSearchTime,
    totalEmbeddings,
    embeddingsLoaded,
    searchesByLanguage,
    similarityDistribution,
    recentSearches,
    topQueries,
  };
}

/**
 * Clear analytics (for testing/reset)
 */
export function clearVectorSearchAnalytics(): void {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      fs.unlinkSync(ANALYTICS_FILE);
    }
    analyticsCache = null;
  } catch (error) {
    console.error('[Vector Analytics] Error clearing analytics:', error);
  }
}

