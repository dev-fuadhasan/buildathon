"use client";

/**
 * Client-side OAuth Callback Handler
 * Handles Supabase OAuth redirects with hash fragments (#access_token=...)
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient, getSupabaseUser } from '@/lib/supabaseAuth';
import Icon from '@/components/Icon';

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get role from query params (preserved through OAuth flow)
        const role = searchParams.get('role') as 'mother' | 'doctor' | null;
        
        if (!role || (role !== 'mother' && role !== 'doctor')) {
          setError('Invalid role specified');
          setTimeout(() => {
            router.push('/mother/login?error=Invalid role specified');
          }, 2000);
          return;
        }

        // Supabase redirects with tokens in hash fragment
        // Extract from window.location.hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const errorParam = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');

        // Handle OAuth errors
        if (errorParam) {
          console.error('[OAuth Callback] Error:', errorParam, errorDescription);
          setError(errorDescription || errorParam || 'Authentication failed');
          setTimeout(() => {
            router.push(`/${role}/login?error=${encodeURIComponent(errorDescription || errorParam || 'Authentication failed')}`);
          }, 2000);
          return;
        }

        if (!accessToken) {
          setError('No access token received');
          setTimeout(() => {
            router.push(`/${role}/login?error=${encodeURIComponent('No access token received')}`);
          }, 2000);
          return;
        }

        // Get user from Supabase using the access token
        const supabase = createSupabaseClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

        if (userError || !user) {
          throw new Error(userError?.message || 'Failed to get user from Supabase');
        }

        const supabaseUser = getSupabaseUser(user);
        if (!supabaseUser || !supabaseUser.email) {
          throw new Error('Failed to retrieve user information from Google');
        }

        // Call our API to create/update user and get JWT token
        const response = await fetch('/api/auth/oauth-complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: supabaseUser.email,
            name: supabaseUser.name,
            role: role,
            supabaseUserId: user.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle pending approval case for doctors
          if (data.requiresApproval) {
            router.push(`/${role}/login?message=${encodeURIComponent(data.error || 'Account created. Please wait for admin approval.')}`);
            return;
          }
          throw new Error(data.error || 'Failed to complete authentication');
        }

        // Save token and redirect
        if (role === 'mother') {
          localStorage.setItem('motherToken', data.token);
          // Check if onboarding is needed
          if (data.requiresOnboarding) {
            router.push('/mother/onboarding?token=' + encodeURIComponent(data.token) + '&oauth=true');
          } else {
            router.push('/mother/dashboard?token=' + encodeURIComponent(data.token) + '&oauth=true');
          }
        } else {
          localStorage.setItem('doctorToken', data.token);
          router.push('/doctor/dashboard?token=' + encodeURIComponent(data.token) + '&oauth=true');
        }
      } catch (err: any) {
        console.error('[OAuth Callback] Error:', err);
        setError(err.message || 'Authentication failed');
        const role = searchParams.get('role') || 'mother';
        setTimeout(() => {
          router.push(`/${role}/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <Icon name="error" size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Authentication Failed</h1>
          <p className="text-slate-600">{error}</p>
          <p className="text-sm text-slate-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
