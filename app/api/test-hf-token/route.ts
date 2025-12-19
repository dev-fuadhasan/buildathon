import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check if HF_TOKEN is available
    const hfToken = process.env.HF_TOKEN;
    
    // Return the status of the environment variables
    return NextResponse.json({
      hfTokenPresent: !!hfToken,
      hfTokenLength: hfToken ? hfToken.length : 0,
      embeddingServiceUrlPresent: !!process.env.EMBEDDING_SERVICE_URL,
      message: "Environment variables check completed"
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to check environment variables"
    }, { status: 500 });
  }
}