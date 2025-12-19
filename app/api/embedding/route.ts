/**
 * API ENDPOINT: Query Embedding
 * 
 * DISABLED: Using pre-computed embeddings in Supabase instead
 * 
 * Queries now use keyword search fallback.
 */

import { NextRequest, NextResponse } from 'next/server';

interface EmbeddingRequest {
  text: string;
}

interface EmbeddingResponseData {
  embedding?: number[];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<EmbeddingResponseData>> {
  console.log('[Embedding API] ℹ️  Query embedding disabled - using keyword search with pre-computed Supabase embeddings');
  
  return NextResponse.json(
    { error: 'Query embedding disabled - using Supabase keyword search' },
    { status: 501 }
  );
}
