/**
 * Embedding Generation Script for MomsCare
 * Generates vector embeddings for all Q&A pairs and saves to embeddings.json
 * 
 * Usage: npm run generate-embeddings
 * 
 * This script:
 * 1. Loads CSV datasets (English + Bangla)
 * 2. Generates embeddings for all questions
 * 3. Saves to embeddings.json file
 * 
 * Run this script:
 * - Once initially to create embeddings
 * - When dataset is updated
 * - After changing embedding model
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { generateEmbedding, getEmbeddingDimensions } from '../lib/embeddings';
import { DatasetItem } from '../lib/dualDatasetLoader';
import { EmbeddingItem } from '../lib/vectorSearch';

// Configuration
const CSV_PATH_EN = path.join(process.cwd(), 'moms_care_dataset.csv');
const CSV_PATH_BN = path.join(process.cwd(), 'moms_care_dataset_bangla.csv');
const OUTPUT_PATH = path.join(process.cwd(), 'embeddings.json');

/**
 * Load and unify datasets from CSV files
 */
function loadDatasets(): DatasetItem[] {
  console.log('📊 [Generate Embeddings] Loading datasets...');

  // Check if files exist
  if (!fs.existsSync(CSV_PATH_EN)) {
    throw new Error(`English dataset not found: ${CSV_PATH_EN}`);
  }
  if (!fs.existsSync(CSV_PATH_BN)) {
    throw new Error(`Bangla dataset not found: ${CSV_PATH_BN}`);
  }

  // Read CSV files
  const csvContentEN = fs.readFileSync(CSV_PATH_EN, 'utf-8');
  const csvContentBN = fs.readFileSync(CSV_PATH_BN, 'utf-8');

  // Parse CSV files
  const recordsEN = parse(csvContentEN, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const recordsBN = parse(csvContentBN, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Verify datasets have same length
  if (recordsEN.length !== recordsBN.length) {
    console.warn(
      `⚠️  Dataset mismatch: EN has ${recordsEN.length} rows, BN has ${recordsBN.length} rows`
    );
  }

  // Unify datasets
  const unifiedDataset: DatasetItem[] = recordsEN.map((enRow: any, index: number) => {
    const bnRow: any = recordsBN[index] || {};
    return {
      question_en: (enRow.question || enRow.question_en || '') as string,
      answer_en: (enRow.answer || enRow.answer_en || '') as string,
      question_bn: (bnRow.question || bnRow.question_bn || '') as string,
      answer_bn: (bnRow.answer || bnRow.answer_bn || '') as string,
      tag: (enRow.tag || bnRow.tag || '') as string,
      context: (enRow.context || bnRow.context || '') as string,
    };
  });

  console.log(`✅ [Generate Embeddings] Loaded ${unifiedDataset.length} Q&A pairs`);
  return unifiedDataset;
}

/**
 * Generate embeddings for all Q&A pairs
 */
async function generateAllEmbeddings(dataset: DatasetItem[]): Promise<EmbeddingItem[]> {
  console.log('🚀 [Generate Embeddings] Using configured embedding service or local generator');
  const dimensions = await getEmbeddingDimensions();
  console.log(`✅ [Generate Embeddings] Model ready (${dimensions} dimensions)`);
  console.log(`📊 [Generate Embeddings] Generating embeddings for ${dataset.length} Q&A pairs...`);

  const embeddings: EmbeddingItem[] = [];
  const batchSize = 5; // Process 5 at a time to avoid memory issues

  for (let i = 0; i < dataset.length; i++) {
    const item = dataset[i];

    try {
      // Generate embeddings for both languages
      const [questionEmbedding_en, questionEmbedding_bn] = await Promise.all([
        generateEmbedding(item.question_en || ''),
        generateEmbedding(item.question_bn || ''),
      ]);

      // Create embedding item
      const embeddingItem: EmbeddingItem = {
        id: i + 1,
        question_en: item.question_en,
        answer_en: item.answer_en,
        question_bn: item.question_bn,
        answer_bn: item.answer_bn,
        tag: item.tag,
        context: item.context,
        questionEmbedding_en,
        questionEmbedding_bn,
      };

      embeddings.push(embeddingItem);

      // Progress logging
      if ((i + 1) % 10 === 0 || i + 1 === dataset.length) {
        const progress = ((i + 1) / dataset.length * 100).toFixed(1);
        console.log(`⏳ [Generate Embeddings] Progress: ${i + 1}/${dataset.length} (${progress}%)`);
      }

      // Small delay to avoid overwhelming the system
      if ((i + 1) % batchSize === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ [Generate Embeddings] Error processing item ${i + 1}:`, error);
      // Continue with next item
    }
  }

  console.log(`✅ [Generate Embeddings] Generated embeddings for ${embeddings.length} Q&A pairs`);
  return embeddings;
}

/**
 * Save embeddings to JSON file
 */
function saveEmbeddings(embeddings: EmbeddingItem[]): void {
  console.log(`💾 [Generate Embeddings] Saving embeddings to ${OUTPUT_PATH}...`);

  try {
    // Create backup if file exists
    if (fs.existsSync(OUTPUT_PATH)) {
      const backupPath = `${OUTPUT_PATH}.backup`;
      fs.copyFileSync(OUTPUT_PATH, backupPath);
      console.log(`📦 [Generate Embeddings] Created backup: ${backupPath}`);
    }

    // Save embeddings
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(embeddings, null, 2), 'utf-8');

    // Calculate file size
    const stats = fs.statSync(OUTPUT_PATH);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ [Generate Embeddings] Saved ${embeddings.length} embeddings to ${OUTPUT_PATH}`);
    console.log(`📊 [Generate Embeddings] File size: ${fileSizeMB} MB`);
  } catch (error) {
    console.error('❌ [Generate Embeddings] Error saving embeddings:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🎯 [Generate Embeddings] Starting embedding generation...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Step 1: Load datasets
    const dataset = loadDatasets();

    if (dataset.length === 0) {
      throw new Error('No data found in datasets');
    }

    // Step 2: Generate embeddings
    const embeddings = await generateAllEmbeddings(dataset);

    if (embeddings.length === 0) {
      throw new Error('No embeddings generated');
    }

    // Step 3: Save embeddings
    saveEmbeddings(embeddings);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [Generate Embeddings] Embedding generation complete!');
    console.log(`📁 Output file: ${OUTPUT_PATH}`);
    console.log(`📊 Total embeddings: ${embeddings.length}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Test vector search: import { semanticSearch } from "./lib/vectorSearch"');
    console.log('   2. Integrate into chat system');
    console.log('   3. Update dualDatasetLoader.ts to use semantic search');
  } catch (error) {
    console.error('❌ [Generate Embeddings] Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as generateEmbeddings };

