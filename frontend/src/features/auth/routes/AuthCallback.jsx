/**
 * =============================================================================
 * OAuth Callback Handler
 * =============================================================================
 * 
 * STATUS: Currently unused for primary auth (Phase 6B).
 * 
 * Primary authentication now uses embedded email/password login with direct
 * Cognito USER_PASSWORD_AUTH (see Login.jsx). This component is kept for:
 * - Future Hosted UI mode (VITE_AUTH_MODE=hosted)
 * - Future social login providers (Google, Apple, etc.)
 * 
 * FLOW (when Hosted UI is enabled):
 * ----------------------------------
 * 1. User clicks "Log In" → redirects to Cognito Hosted UI
 * 2. User authenticates → Cognito redirects back to /auth/callback?code=xxx
 * 3. This component exchanges the code for tokens using PKCE
 * 4. Tokens are stored in auth store
 * 5. User is redirected to the app
 * 
 * =============================================================================
 */

import { auth } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/auth';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors from Cognito
        if (errorParam) {
          throw new Error(errorDescription || `OAuth error: ${errorParam}`);
        }

        // No code means something went wrong
        if (!code) {
          throw new Error('No authorization code received');
        }

        // Exchange code for tokens using the auth client's handleCallback
        // This uses PKCE and the stored verifier
        const result = await auth.handleCallback();

        if (!result || !result.accessToken) {
          throw new Error('Token exchange failed - no access token received');
        }

        // Decode the ID token to extract basic user info
        let userInfo = {};
        if (result.idToken) {
          try {
            // Decode JWT payload (base64url decode the middle part)
            const payload = result.idToken.split('.')[1];
            const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
            userInfo = {
              sub: decoded.sub,
              email: decoded.email,
              name: decoded.name || decoded.email?.split('@')[0],
              emailVerified: decoded.email_verified,
            };
          } catch (decodeErr) {
            console.warn('[AuthCallback] Could not decode ID token:', decodeErr);
          }
        }

        // Store tokens in auth store
        setAuth({
          user: userInfo,
          accessToken: result.accessToken,
          // Note: refreshToken is not stored in state for security
          // It should be stored in httpOnly cookies by the backend if needed
          rememberMe: true,
        });

        // Store refresh token in sessionStorage for token refresh
        // (In production, this should be handled more securely)
        if (result.refreshToken) {
          try {
            sessionStorage.setItem('barkbase_refresh_token', result.refreshToken);
          } catch (e) {
            console.warn('[AuthCallback] Could not store refresh token');
          }
        }

        // Redirect to the app
        const returnPath = sessionStorage.getItem('barkbase_return_path') || '/today';
        sessionStorage.removeItem('barkbase_return_path');
        
        navigate(returnPath, { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setError(err.message || 'Authentication failed');
        setProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, setAuth, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Authentication Failed</h1>
          <p className="text-gray-600 dark:text-text-secondary mb-6">{error}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-text-secondary">
          {processing ? 'Completing sign in...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;

