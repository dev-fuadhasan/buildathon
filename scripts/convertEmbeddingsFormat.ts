#!/usr/bin/env node

/**
 * EMBEDDINGS FORMAT CONVERTER
 * 
 * Converts embeddings.json to client-compatible format
 * Run: npx ts-node scripts/convertEmbeddingsFormat.ts
 * 
 * This script:
 * 1. Reads your current embeddings.json
 * 2. Ensures proper format for client-side search
 * 3. Validates all embeddings have 768 dimensions
 * 4. Writes back to public/embeddings.json
 */

import * as fs from 'fs';
import * as path from 'path';

interface LegacyEmbedding {
  id?: string;
  question: string;
  answer: string;
  embedding?: number[];
  vector?: number[];
  embeddings?: number[];
}

interface ClientEmbedding {
  id: string;
  question: string;
  answer: string;
  embedding: number[];
}

const EMBEDDING_DIMENSION = 768;

async function convertEmbeddingsFormat(): Promise<void> {
  console.log('[Converter] Starting embeddings format conversion...\n');

  // Find embeddings file
  const embeddingsPath = path.join(process.cwd(), 'embeddings.json');

  if (!fs.existsSync(embeddingsPath)) {
    console.error(`❌ File not found: ${embeddingsPath}`);
    process.exit(1);
  }

  try {
    // Read current embeddings
    console.log('[Converter] Reading embeddings.json...');
    const rawData = fs.readFileSync(embeddingsPath, 'utf-8');
    const legacyEmbeddings: LegacyEmbedding[] = JSON.parse(rawData);

    if (!Array.isArray(legacyEmbeddings)) {
      throw new Error('Embeddings must be an array');
    }

    console.log(`[Converter] Found ${legacyEmbeddings.length} embeddings\n`);

    // Convert format
    const convertedEmbeddings: ClientEmbedding[] = [];
    const errors: string[] = [];

    legacyEmbeddings.forEach((item, index) => {
      try {
        // Get embedding (try multiple possible field names)
        let embedding = item.embedding || item.vector || item.embeddings;

        if (!Array.isArray(embedding)) {
          errors.push(`Item ${index}: No valid embedding found`);
          return;
        }

        // Validate dimension
        if (embedding.length !== EMBEDDING_DIMENSION) {
          console.warn(
            `⚠️  Item ${index}: Expected ${EMBEDDING_DIMENSION} dimensions, got ${embedding.length}`
          );
        }

        // Create client-compatible format
        const clientEmbedding: ClientEmbedding = {
          id: item.id || `q-${index}`,
          question: item.question || '',
          answer: item.answer || '',
          embedding: embedding,
        };

        // Validate required fields
        if (!clientEmbedding.question.trim()) {
          errors.push(`Item ${index}: Empty question`);
          return;
        }

        if (!clientEmbedding.answer.trim()) {
          errors.push(`Item ${index}: Empty answer`);
          return;
        }

        convertedEmbeddings.push(clientEmbedding);
      } catch (err) {
        errors.push(`Item ${index}: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    // Report conversion results
    console.log(`✓ Successfully converted: ${convertedEmbeddings.length} embeddings`);
    if (errors.length > 0) {
      console.log(`⚠️  Errors found: ${errors.length}`);
      errors.slice(0, 5).forEach(err => console.log(`  - ${err}`));
      if (errors.length > 5) {
        console.log(`  ... and ${errors.length - 5} more`);
      }
    }
    console.log('');

    // Validate statistics
    const dimensions = convertedEmbeddings.map(e => e.embedding.length);
    const avgDim = dimensions.length > 0 
      ? Math.round(dimensions.reduce((a, b) => a + b) / dimensions.length)
      : 0;

    console.log('[Converter] Statistics:');
    console.log(`  Total valid embeddings: ${convertedEmbeddings.length}`);
    console.log(`  Avg embedding dimension: ${avgDim}`);
    console.log(`  File size: ${(JSON.stringify(convertedEmbeddings).length / 1024 / 1024).toFixed(2)}MB\n`);

    // Write to public folder for client access
    const publicPath = path.join(process.cwd(), 'public', 'embeddings.json');
    const publicDir = path.dirname(publicPath);

    if (!fs.existsSync(publicDir)) {
      console.log(`[Converter] Creating public directory...`);
      fs.mkdirSync(publicDir, { recursive: true });
    }

    console.log('[Converter] Writing to public/embeddings.json...');
    fs.writeFileSync(
      publicPath,
      JSON.stringify(convertedEmbeddings, null, 2),
      'utf-8'
    );

    console.log(`✅ Successfully wrote ${convertedEmbeddings.length} embeddings to public/embeddings.json`);
    console.log('\n✓ Embeddings ready for client-side search!');

  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

// Run conversion
convertEmbeddingsFormat().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
