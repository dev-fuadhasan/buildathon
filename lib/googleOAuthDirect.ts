/**
 * Direct Google OAuth Implementation
 * Bypasses Supabase to avoid privacy policy message
 */

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '128288294628-dj97i7076j0cq7safd904f4ksqoo46c8.apps.googleusercontent.com';

/**
 * Generate Google OAuth URL directly
 */
export function getGoogleOAuthUrlDirect(role: 'mother' | 'doctor'): string {
  const appUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://momscareai.vercel.app');
  
  const redirectUri = `${appUrl}/auth/google/callback?role=${role}`;
  
  // Generate state parameter for security (CSRF protection)
  const state = btoa(JSON.stringify({ 
    role, 
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(7)
  })).replace(/[+/=]/g, ''); // URL-safe base64
  
  // Store state in sessionStorage for verification
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('oauth_state', state);
  }
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Verify OAuth state parameter
 */
export function verifyOAuthState(state: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const storedState = sessionStorage.getItem('oauth_state');
  if (!storedState || storedState !== state) {
    return false;
  }
  
  // Clean up
  sessionStorage.removeItem('oauth_state');
  
  // Verify state is not too old (5 minutes max)
  try {
    const decoded = JSON.parse(atob(state));
    const age = Date.now() - decoded.timestamp;
    if (age > 5 * 60 * 1000) {
      return false; // State too old
    }
    return true;
  } catch {
    return false;
  }
}
