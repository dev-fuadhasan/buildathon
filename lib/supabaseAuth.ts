/**
 * Supabase Authentication Client for Google OAuth
 * Handles OAuth authentication and user management
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client-side Supabase client (for OAuth flow)
export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials are missing. Please check environment variables.');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server-side Supabase client (for admin operations)
export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase service role key is missing. Please check environment variables.');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Get Google OAuth URL for authentication
 * Note: Supabase redirects to client-side callback with hash fragments
 */
export async function getGoogleOAuthUrl(role: 'mother' | 'doctor', redirectTo?: string): Promise<string> {
  const supabase = createSupabaseClient();
  
  // Use the app URL for callback - must be absolute URL
  // Supabase will redirect to this URL with hash fragments (#access_token=...)
  // Always use production URL for consistency (Supabase needs exact match)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://momscareai.vercel.app');
  
  // Use client-side callback page that handles hash fragments
  const redirectUrl = redirectTo || `${appUrl}/auth/callback?role=${role}`;
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw new Error(`Failed to initiate Google OAuth: ${error.message}`);
  }

  if (!data.url) {
    throw new Error('Failed to get OAuth URL from Supabase');
  }

  return data.url;
}

/**
 * Handle OAuth callback and get user session
 * Supabase redirects to our callback with code in query params
 */
export async function handleOAuthCallback(code: string) {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    throw new Error(`OAuth callback failed: ${error.message}`);
  }

  if (!data.session || !data.user) {
    throw new Error('No session or user data received from Supabase');
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * Get user information from Supabase user object
 */
export function getSupabaseUser(user: any) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || '',
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
    provider: user.app_metadata?.provider || 'google',
  };
}

/**
 * Sign out from Supabase
 */
export async function signOutSupabase() {
  const supabase = createSupabaseClient();
  await supabase.auth.signOut();
}
