/**
 * Vector Search Interface
 * Provides a unified interface for semantic search operations
 */

// Define the EmbeddingItem interface
export interface EmbeddingItem {
  id: number;
  question_en: string;
  answer_en: string;
  question_bn: string;
  answer_bn: string;
  tag: string;
  context: string;
  questionEmbedding_en: number[];
  questionEmbedding_bn: number[];
}

// Re-export functions from the appropriate modules
export { initializeVectorDB } from './vectorDB';

// Wrapper function to handle different signatures
// This version works on both client and server by dynamically importing the appropriate module
export async function semanticSearch(query: string, language: string, limit: number = 3) {
  try {
    // Try to import the client-side version first
    const { semanticSearch: clientSemanticSearch } = await import('./supabaseSemanticSearch');
    
    // Call with appropriate parameters
    const results = await clientSemanticSearch(query, { maxResults: limit });
    
    // Convert SearchResult to the expected format
    return results.map(result => ({
      similarity: result.similarity,
      item: {
        question_en: language === 'en' ? result.question : '',
        answer_en: language === 'en' ? result.answer : '',
        question_bn: language === 'bn' ? result.question : '',
        answer_bn: language === 'bn' ? result.answer : '',
        tag: result.category || '',
        context: ''
      }
    }));
  } catch (clientError) {
    // If client import fails, try server-side version
    try {
      const { semanticSearchServer } = await import('./supabaseSemanticSearchServer');
      
      // Call server-side semantic search
      const results = await semanticSearchServer(query, { maxResults: limit });
      
      // Convert SearchResult to the expected format
      return results.map(result => ({
        similarity: result.similarity,
        item: {
          question_en: language === 'en' ? result.question : '',
          answer_en: language === 'en' ? result.answer : '',
          question_bn: language === 'bn' ? result.question : '',
          answer_bn: language === 'bn' ? result.answer : '',
          tag: result.category || '',
          context: ''
        }
      }));
    } catch (serverError) {
      // If both fail, re-throw the client error as it's more likely to be the intended one
      throw clientError;
    }
  }
}

// Check if embeddings are available
export function hasEmbeddings(): boolean {
  // For Supabase vector search, check if we have the required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return !!(supabaseUrl && supabaseAnonKey);
}

// Placeholder for logging (actual implementation is in vectorSearchAnalytics)
export function logVectorSearch(logData: any): void {
  // In a browser environment, we might send this to an API
  // For now, just log to console
  console.log('[VectorSearch] Search logged:', logData);
}

// Export types
export type { SearchResult } from './supabaseSemanticSearchServer';
export type { SearchOptions } from './supabaseSemanticSearchServer';