/**
 * TEST ENDPOINT: Verify Hugging Face Embedding Service
 *
 * GET /api/test-embedding
 *
 * This endpoint tests if the Hugging Face embedding service is working properly
 * with the configured environment variables.
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/huggingfaceEmbedding';

interface TestResponse {
  success: boolean;
  message?: string;
  embedding?: number[];
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<TestResponse>> {
  try {
    console.log('[TEST EMBEDDING] Starting test...');
    
    // Check if HF_TOKEN is configured
    const hfToken = process.env.HF_TOKEN;
    console.log('[TEST EMBEDDING] HF_TOKEN configured:', !!hfToken);
    
    if (!hfToken) {
      return NextResponse.json({
        success: false,
        error: 'HF_TOKEN environment variable is not configured'
      }, { status: 500 });
    }
    
    // Test with a sample query
    const testQuery = "What should I do if I have a headache during pregnancy?";
    console.log('[TEST EMBEDDING] Testing with query:', testQuery);
    
    // Try to generate embedding
    const embedding = await generateEmbedding(testQuery);
    
    console.log('[TEST EMBEDDING] Embedding generated successfully');
    console.log('[TEST EMBEDDING] Embedding length:', embedding.length);
    
    return NextResponse.json({
      success: true,
      message: 'Hugging Face embedding service is working correctly',
      embedding: embedding.slice(0, 5) // Return first 5 values for verification
    });
    
  } catch (error: any) {
    console.error('[TEST EMBEDDING] Error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: `Failed to test embedding service: ${errorMsg}`
    }, { status: 500 });
  }
}