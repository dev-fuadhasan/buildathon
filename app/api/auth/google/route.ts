/**
 * Google OAuth Initiation API
 * Returns the Google OAuth URL for the specified role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getGoogleOAuthUrl } from '@/lib/supabaseAuth';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const role = searchParams.get('role') as 'mother' | 'doctor';

    if (!role || (role !== 'mother' && role !== 'doctor')) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "mother" or "doctor"' },
        { status: 400 }
      );
    }

    const authUrl = await getGoogleOAuthUrl(role);
    
    return NextResponse.json({ url: authUrl });
  } catch (err: any) {
    console.error('[Google OAuth API] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initiate Google OAuth' },
      { status: 500 }
    );
  }
}
