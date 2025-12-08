import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface KnowledgeChunk {
  id: string;
  source_title: string;
  source_type: string;
  source_author: string;
  source_year: string;
  chunk_index: string;
  content_chunk: string;
  tags: string;
}

let knowledgeBase: KnowledgeChunk[] = [];
let isLoaded = false;

/**
 * Load the CSV dataset into memory at server startup
 */
export function loadKnowledgeBase(): void {
  if (isLoaded) return;

  try {
    const csvPath = path.join(process.cwd(), 'knowledge_base.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    knowledgeBase = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as KnowledgeChunk[];

    isLoaded = true;
    console.log(`✅ Knowledge base loaded: ${knowledgeBase.length} chunks`);
  } catch (error) {
    console.error('❌ Failed to load knowledge base:', error);
    knowledgeBase = [];
    isLoaded = false;
  }
}

/**
 * Simple keyword matching and TF-IDF-like relevance scoring
 */
function calculateRelevance(query: string, chunk: KnowledgeChunk): number {
  const queryLower = query.toLowerCase();
  const contentLower = chunk.content_chunk.toLowerCase();
  const tagsLower = chunk.tags.toLowerCase();
  
  // Tokenize query into words (remove common stop words)
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very',
  ]);
  
  const queryWords = queryLower
    .split(/\W+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  if (queryWords.length === 0) return 0;

  let score = 0;
  
  // Check for exact phrase match (highest weight)
  if (contentLower.includes(queryLower)) {
    score += 100;
  }
  
  // Check tags (high weight)
  const tagWords = tagsLower.split(/[,\s]+/).filter(t => t.length > 0);
  for (const queryWord of queryWords) {
    if (tagWords.some(tag => tag.includes(queryWord) || queryWord.includes(tag))) {
      score += 20;
    }
  }
  
  // Check content for individual words (medium weight)
  for (const queryWord of queryWords) {
    // Count occurrences (with diminishing returns)
    const regex = new RegExp(`\\b${queryWord}\\w*`, 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      // TF-IDF-like: more occurrences = higher score, but with logarithmic scaling
      score += Math.min(matches.length * 5, 25);
    }
  }
  
  // Bonus for medical/pregnancy keywords
  const medicalKeywords = [
    'pregnancy', 'pregnant', 'maternal', 'fetal', 'baby', 'infant', 'child',
    'health', 'medical', 'clinical', 'doctor', 'nurse', 'midwife', 'care',
    'birth', 'delivery', 'trimester', 'weeks', 'months', 'symptoms', 'treatment',
    'complication', 'risk', 'nutrition', 'diet', 'exercise', 'medication',
    'vaccine', 'test', 'screening', 'ultrasound', 'prenatal', 'postnatal',
    'breastfeeding', 'lactation', 'postpartum', 'neonatal', 'pediatric',
  ];
  
  for (const keyword of medicalKeywords) {
    if (queryLower.includes(keyword) && contentLower.includes(keyword)) {
      score += 15;
    }
  }
  
  return score;
}

/**
 * Search the dataset for the most relevant chunk
 * @param userQuestion - The user's question
 * @param topK - Number of top results to return (default: 1)
 * @returns The most relevant chunks or null if no relevant match found
 */
export function searchDataset(
  userQuestion: string,
  topK: number = 1
): KnowledgeChunk[] | null {
  // Ensure dataset is loaded
  if (!isLoaded) {
    loadKnowledgeBase();
  }

  if (knowledgeBase.length === 0) {
    console.warn('Knowledge base is empty');
    return null;
  }

  // Calculate relevance scores for all chunks
  const scoredChunks = knowledgeBase
    .map(chunk => ({
      chunk,
      score: calculateRelevance(userQuestion, chunk),
    }))
    .filter(item => item.score > 0) // Only include chunks with some relevance
    .sort((a, b) => b.score - a.score); // Sort by score descending

  // Return top K results if score is above threshold
  const RELEVANCE_THRESHOLD = 30; // Minimum score to be considered relevant
  
  if (scoredChunks.length === 0 || scoredChunks[0].score < RELEVANCE_THRESHOLD) {
    return null;
  }

  return scoredChunks.slice(0, topK).map(item => item.chunk);
}

/**
 * Format knowledge chunks for context injection
 */
export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (!chunks || chunks.length === 0) return '';

  const formattedChunks = chunks
    .map((chunk, index) => {
      return `[SOURCE ${index + 1}: ${chunk.source_title} (${chunk.source_type})]\n${chunk.content_chunk.trim()}`;
    })
    .join('\n\n');

  return `\n\nCONTEXT FROM OUR MEDICAL DATASET:\n${formattedChunks}\n\nUse the above context to inform your answer when relevant, but also use your own medical knowledge.`;
}

// Auto-load at module initialization (for server startup)
if (typeof window === 'undefined') {
  // Only load on server-side
  loadKnowledgeBase();
}

