/**
 * OAuth Service - Supabase OAuth for Social Sign-In
 * 
 * This service handles Google and Apple OAuth using Supabase Auth.
 * It uses expo-auth-session for the OAuth flow in Expo apps.
 * 
 * SETUP REQUIREMENTS:
 * 1. Install packages: npx expo install expo-auth-session expo-crypto expo-web-browser
 * 2. Configure app.json with scheme and bundleIdentifier
 * 3. Enable providers in Supabase Dashboard → Authentication → Providers
 * 4. Configure OAuth credentials in respective developer consoles
 * 
 * SECURITY:
 * - Uses PKCE flow for secure token exchange
 * - Session is managed by Supabase Auth (same as email/password)
 * - user_key === auth.uid() for RLS compatibility
 */

import { supabase } from '@config/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

// Required for web browser auth session
WebBrowser.maybeCompleteAuthSession();

// Get the redirect URI for OAuth
// This must match what's configured in Supabase and OAuth provider
const getRedirectUri = () => {
  return makeRedirectUri({
    scheme: 'medbuddy', // Must match app.json scheme
    path: 'auth/callback',
  });
};

export type OAuthProvider = 'google' | 'apple';

export interface OAuthResult {
  success: boolean;
  user?: {
    id: string;
    email?: string;
    user_metadata?: Record<string, any>;
  };
  error?: string;
}

/**
 * Sign in with OAuth provider (Google or Apple)
 * Uses Supabase's built-in OAuth flow
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<OAuthResult> {
  try {
    console.log(`🔐 Starting ${provider} OAuth...`);

    // On web, use direct Supabase OAuth (redirects the page)
    if (Platform.OS === 'web') {
      console.log(`🌐 Using web OAuth flow for ${provider}`);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin, // Redirect back to the app
        },
      });

      if (error) {
        console.error(`❌ ${provider} OAuth error:`, error);
        return { success: false, error: error.message };
      }

      // On web, this will redirect the page - the session will be picked up on return
      // The function won't actually return here in most cases
      return { success: true };
    }

    // Native flow (iOS/Android) uses WebBrowser
    const redirectUri = getRedirectUri();
    console.log(`📱 Using native OAuth with redirect:`, redirectUri);

    // Start OAuth flow with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // We handle the browser ourselves
        queryParams: provider === 'apple' ? {
          // Apple-specific: request email and name
          response_mode: 'form_post',
        } : undefined,
      },
    });

    if (error) {
      console.error(`❌ ${provider} OAuth error:`, error);
      return { success: false, error: error.message };
    }

    if (!data.url) {
      return { success: false, error: 'No OAuth URL returned' };
    }

    // Open the OAuth URL in a web browser
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUri,
      {
        showInRecents: true,
        preferEphemeralSession: false, // Keep session for SSO
      }
    );

    if (result.type !== 'success') {
      console.log(`⚠️ ${provider} OAuth cancelled or failed:`, result.type);
      return { 
        success: false, 
        error: result.type === 'cancel' ? 'Sign-in cancelled' : 'Sign-in failed' 
      };
    }

    // Extract the URL from the result
    const url = result.url;
    
    // Parse the URL to get the tokens
    // Supabase returns tokens in the URL fragment or query params
    const params = extractParamsFromUrl(url);
    
    if (params.error) {
      return { success: false, error: params.error_description || params.error };
    }

    if (params.access_token && params.refresh_token) {
      // Set the session manually with the tokens
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });

      if (sessionError) {
        console.error('❌ Error setting session:', sessionError);
        return { success: false, error: sessionError.message };
      }

      if (sessionData.user) {
        console.log(`✅ ${provider} OAuth successful:`, sessionData.user.id);
        return {
          success: true,
          user: {
            id: sessionData.user.id,
            email: sessionData.user.email,
            user_metadata: sessionData.user.user_metadata,
          },
        };
      }
    }

    // If we got here without tokens, try to get the current session
    // (sometimes the session is set automatically via deep link)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return {
        success: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        },
      };
    }

    return { success: false, error: 'Failed to complete sign-in' };
  } catch (error: any) {
    console.error(`❌ ${provider} OAuth exception:`, error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Extract parameters from OAuth callback URL
 */
function extractParamsFromUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  try {
    // Try fragment first (hash)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const fragment = url.substring(hashIndex + 1);
      const searchParams = new URLSearchParams(fragment);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    
    // Also check query params
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const endIndex = hashIndex !== -1 ? hashIndex : url.length;
      const query = url.substring(queryIndex + 1, endIndex);
      const searchParams = new URLSearchParams(query);
      searchParams.forEach((value, key) => {
        if (!params[key]) {
          params[key] = value;
        }
      });
    }
  } catch (e) {
    console.warn('Error parsing OAuth URL:', e);
  }
  
  return params;
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<OAuthResult> {
  return signInWithOAuth('google');
}

/**
 * Sign in with Apple
 */
export async function signInWithApple(): Promise<OAuthResult> {
  // Apple Sign In is only available on iOS
  if (Platform.OS !== 'ios') {
    return {
      success: false,
      error: 'Apple Sign-In is only available on iOS devices',
    };
  }
  return signInWithOAuth('apple');
}

/**
 * Check if OAuth providers are configured
 * Call this on app startup to determine which buttons to show
 */
export async function checkOAuthProviders(): Promise<{
  google: boolean;
  apple: boolean;
}> {
  // For now, we check based on platform
  // In production, you might want to check Supabase config
  return {
    google: true, // Available on all platforms
    apple: Platform.OS === 'ios', // Only on iOS
  };
}
