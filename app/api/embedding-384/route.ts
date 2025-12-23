/**
 * API ENDPOINT: 384-Dimensional Query Embedding (LOCAL)
 *
 * POST /api/embedding-384
 *
 * Generates embeddings locally by invoking the Python helper
 * `scripts/query_embed.py` which uses the same model as the dataset.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

interface EmbeddingRequest {
  text: string;
}

interface EmbeddingResponseData {
  embedding?: number[];
  error?: string;
}

function validateInput(text: any): boolean {
  return typeof text === 'string' && text.trim().length > 0;
}

function validateEmbedding(embedding: any): boolean {
  if (!Array.isArray(embedding)) return false;
  if (embedding.length !== 384) return false;
  return embedding.every(val => typeof val === 'number');
}

export async function POST(request: NextRequest): Promise<NextResponse<EmbeddingResponseData>> {
  try {
    const body = await request.json() as EmbeddingRequest;

    if (!validateInput(body.text)) {
      return NextResponse.json({ error: 'Invalid input: text must be a non-empty string' }, { status: 400 });
    }

    try {
      // Debug logging
      console.log('[Embedding-384] Environment variables:');
      console.log('[Embedding-384] EMBEDDING_SERVICE_URL:', process.env.EMBEDDING_SERVICE_URL ? 'SET' : 'NOT SET');
      console.log('[Embedding-384] HF_TOKEN:', process.env.HF_TOKEN ? 'SET' : 'NOT SET');
      
      // If an external embedding service is configured, proxy the request to it
      const serviceUrl = process.env.EMBEDDING_SERVICE_URL;
      if (serviceUrl) {
        const res = await fetch(serviceUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.EMBEDDING_SERVICE_KEY ? { Authorization: `Bearer ${process.env.EMBEDDING_SERVICE_KEY}` } : {}),
          },
          body: JSON.stringify({ text: body.text }),
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error('[Embedding-384] External embedding service error:', res.status, txt);
          return NextResponse.json({ error: 'External embedding service error' }, { status: 502 });
        }

        const json = await res.json();
        const embedding = json.embedding || json.data?.embedding || null;
        if (!Array.isArray(embedding) || embedding.length !== 384) {
          console.error('[Embedding-384] Invalid embedding shape from external service');
          return NextResponse.json({ error: 'Invalid embedding from service' }, { status: 502 });
        }

        console.log('[VECTOR SEARCH] Query embedding generated (384-dim) via external service');
        return NextResponse.json({ embedding });
      } else if (process.env.HF_TOKEN) {
        // Use Hugging Face API as fallback when no external service is configured
        console.log('[Embedding-384] No external service configured, using Hugging Face API');
        
        try {
          // Dynamically import the Hugging Face inference library
          const { HfInference } = await import('@huggingface/inference');
          
          const hf = new HfInference(process.env.HF_TOKEN);
          
          // Use feature extraction with the intfloat/multilingual-e5-small model
          const result = await hf.featureExtraction({
            model: 'intfloat/multilingual-e5-small',
            inputs: `query: ${body.text}`
          });
          
          // The result should be an array with the embedding
          if (!Array.isArray(result) || result.length === 0) {
            console.error('[Embedding-384] Invalid response from Hugging Face API');
            return NextResponse.json({ error: 'Invalid response from Hugging Face API' }, { status: 502 });
          }
          
          // Extract the embedding vector and ensure it's a flat array of numbers
          let embedding = Array.isArray(result[0]) ? result[0] : result;
          
          // If it's still not a flat array of numbers, flatten it
          if (Array.isArray(embedding) && embedding.length > 0 && Array.isArray(embedding[0])) {
            embedding = embedding.flat();
          }
          
          // Validate embedding dimensions (should be 384 for intfloat/multilingual-e5-small)
          if (!Array.isArray(embedding) || embedding.length !== 384) {
            console.error('[Embedding-384] Invalid embedding dimensions from Hugging Face API:', embedding.length);
            return NextResponse.json({ error: `Invalid embedding dimensions: ${embedding.length}` }, { status: 502 });
          }

          console.log('[VECTOR SEARCH] Query embedding generated (384-dim) via Hugging Face API');
          return NextResponse.json({ embedding: embedding as number[] });
        } catch (hfError: any) {
          console.error('[Embedding-384] Hugging Face API error:', hfError.message);
          return NextResponse.json({ error: `Hugging Face API error: ${hfError.message}` }, { status: 500 });
        }
      } else {
        // Use standalone Python script for embedding generation
        console.log('[Embedding-384] No external service or HF API key configured, using standalone Python script');
        
        // Import Node.js child_process to run Python script
        const { spawn } = require('child_process');
        const path = require('path');
        
        return new Promise((resolve) => {
          // Spawn Python process to run the embedding script
          const pythonPath = process.env.PYTHON_PATH || 'python';
          const scriptPath = path.join(process.cwd(), 'scripts', 'query_embed.py');
          
          const pythonProcess = spawn(pythonPath, [scriptPath, body.text]);
          
          let stdoutData = '';
          let stderrData = '';
          
          pythonProcess.stdout.on('data', (data: Buffer) => {
            stdoutData += data.toString();
          });
          
          pythonProcess.stderr.on('data', (data: Buffer) => {
            stderrData += data.toString();
          });
          
          pythonProcess.on('close', (code: number) => {
            if (code !== 0) {
              console.error(`[Embedding-384] Python script failed with code ${code}:`, stderrData);
              resolve(NextResponse.json({ error: `Python script failed: ${stderrData}` }, { status: 500 }));
              return;
            }
            
            try {
              const result = JSON.parse(stdoutData);
              
              if (result.error) {
                console.error('[Embedding-384] Python script error:', result.error);
                resolve(NextResponse.json({ error: result.error }, { status: 500 }));
                return;
              }
              
              if (!Array.isArray(result.embedding) || result.embedding.length !== 384) {
                console.error('[Embedding-384] Invalid embedding from Python script');
                resolve(NextResponse.json({ error: 'Invalid embedding from Python script' }, { status: 500 }));
                return;
              }
              
              console.log('[VECTOR SEARCH] Query embedding generated (384-dim) via Python script');
              resolve(NextResponse.json({ embedding: result.embedding }));
            } catch (parseErr) {
              console.error('[Embedding-384] Failed to parse Python script output:', stdoutData, parseErr);
              resolve(NextResponse.json({ error: 'Failed to parse embedding result' }, { status: 500 }));
            }
          });
          
          pythonProcess.on('error', (err: Error) => {
            console.error('[Embedding-384] Failed to spawn Python process:', err);
            resolve(NextResponse.json({ error: 'Failed to run embedding script' }, { status: 500 }));
          });
        });
      }
    } catch (err: any) {
      console.error('[Embedding-384] Embedding error:', err && err.message ? err.message : err);
      return NextResponse.json({ error: 'Embedding generation error' }, { status: 500 });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Embedding-384] Error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
