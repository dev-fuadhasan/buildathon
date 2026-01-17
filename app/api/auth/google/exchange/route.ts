/**
 * Exchange Google OAuth code for tokens
 * Server-side only (keeps client secret secure)
 */

import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '128288294628-dj97i7076j0cq7safd904f4ksqoo46c8.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';

export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'Code and redirect URI are required' },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[Google OAuth Exchange] Error:', errorData);
      return NextResponse.json(
        { error: errorData.error_description || 'Failed to exchange code for tokens' },
        { status: 400 }
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get user information from Google' },
        { status: 400 }
      );
    }

    const userInfo = await userInfoResponse.json();

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || userInfo.given_name + ' ' + userInfo.family_name,
        picture: userInfo.picture,
        verified_email: userInfo.verified_email,
      },
    });
  } catch (err: any) {
    console.error('[Google OAuth Exchange] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to exchange OAuth code' },
      { status: 500 }
    );
  }
}
