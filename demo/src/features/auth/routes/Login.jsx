/**
 * =============================================================================
 * BarkBase Login Page
 * =============================================================================
 * 
 * AUTH FLOW (Phase 6B - Embedded Mode):
 * -------------------------------------
 * Primary auth uses Barkbase's own embedded login form with direct Cognito
 * USER_PASSWORD_AUTH. Users enter email/password on this page, and we
 * authenticate directly against Cognito without redirecting to Hosted UI.
 * 
 * The backend API (protected routes at /api/v1/*) expects valid JWTs from
 * Cognito in the Authorization: Bearer header.
 * 
 * MODES:
 * ------
 * - 'embedded' (default): Email/password form → Cognito USER_PASSWORD_AUTH
 * - 'hosted': Redirect to Cognito Hosted UI (OAuth2 + PKCE)
 * 
 * =============================================================================
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { auth, apiClient } from '@/lib/apiClient';
import { config } from '@/config/env';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth, updateTokens, isAuthenticated } = useAuthStore();
  const { setTenant, setLoading: setTenantLoading } = useTenantStore();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm();

  // If already authenticated, redirect to app
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/today', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Decode JWT to extract user info
  const decodeIdToken = (idToken) => {
    try {
      const payload = idToken.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.email?.split('@')[0],
        emailVerified: decoded.email_verified,
      };
    } catch (err) {
      console.warn('[Login] Could not decode ID token:', err);
      return {};
    }
  };

  // Handle embedded login (direct Cognito USER_PASSWORD_AUTH)
  const handleEmbeddedLogin = async (data) => {
    try {
      const { email, password } = data;

      // Check if Cognito is configured (need at least clientId for USER_PASSWORD_AUTH)
      if (!config.cognitoClientId) {
        throw new Error('Cognito is not configured. Please check VITE_COGNITO_CLIENT_ID in your .env file.');
      }

      // Call Cognito USER_PASSWORD_AUTH via CognitoPasswordClient
      const result = await auth.signIn({ email, password });

      if (!result || !result.accessToken) {
        throw new Error('Authentication failed - no access token received');
      }

      if (import.meta.env.DEV) console.log('[Login] Authentication successful');

      // Call backend to create session record (uses raw fetch intentionally - auth endpoint before apiClient is configured)
      try {
        const loginResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/login`, { // eslint-disable-line no-restricted-syntax
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accessToken: result.accessToken,
            idToken: result.idToken,
          }),
        });

        if (!loginResponse.ok) {
          console.warn('[Login] Backend login call failed:', loginResponse.status);
        } else {
          const loginData = await loginResponse.json();
          if (import.meta.env.DEV) console.log('[Login] Backend session created:', loginData.session);
        }
      } catch (backendError) {
        console.warn('[Login] Failed to create backend session:', backendError.message);
        // Don't fail login if backend session creation fails
      }

      // Decode ID token to get user info
      const userInfo = result.idToken ? decodeIdToken(result.idToken) : { email };

      // Store tokens in auth store (initial, without tenantId yet)
      setAuth({
        user: userInfo,
        accessToken: result.accessToken,
      });

      // Store refresh token in sessionStorage for token refresh
      if (result.refreshToken) {
        try {
          sessionStorage.setItem('barkbase_refresh_token', result.refreshToken);
        } catch {
          console.warn('[Login] Could not store refresh token');
        }
      }

      // Bootstrap: Fetch tenant config using the new access token
      // This hydrates both profile and tenant info from /api/v1/config/tenant
      if (import.meta.env.DEV) console.log('[Login] Bootstrapping tenant config...');
      setTenantLoading(true);
      try {
        const tenantResponse = await apiClient.get(canonicalEndpoints.settings.tenant);
        if (tenantResponse.data) {
          const tenantConfig = tenantResponse.data;

          // Update auth store with tenantId and role from config
          updateTokens({
            tenantId: tenantConfig.tenantId || tenantConfig.recordId,
            role: tenantConfig.user?.role,
          });

          // Update tenant store with full tenant data
          setTenant({
            recordId: tenantConfig.tenantId || tenantConfig.recordId,
            accountCode: tenantConfig.accountCode,
            slug: tenantConfig.slug,
            name: tenantConfig.name,
            plan: tenantConfig.plan,
            settings: tenantConfig.settings,
            theme: tenantConfig.theme,
            featureFlags: tenantConfig.featureFlags,
          });

          if (import.meta.env.DEV) console.log('[Login] Tenant config loaded:', {
            tenantId: tenantConfig.tenantId,
            slug: tenantConfig.slug,
            hasOnboardingCompleted: tenantConfig.hasOnboardingCompleted,
          });
        }
      } catch (tenantError) {
        // Log but don't block login - TenantLoader will retry
        console.warn('[Login] Failed to bootstrap tenant config:', tenantError.message);
      } finally {
        setTenantLoading(false);
      }

      // Redirect to the app
      const returnPath = sessionStorage.getItem('barkbase_return_path') || '/today';
      sessionStorage.removeItem('barkbase_return_path');
      navigate(returnPath, { replace: true });
    } catch (err) {
      console.error('[Login] Error:', err);

      // Map common Cognito errors to user-friendly messages
      let message = err.message || 'Unable to sign in. Please try again.';
      if (err.name === 'NotAuthorizedException') {
        message = 'Invalid email or password.';
      } else if (err.name === 'UserNotFoundException') {
        message = 'No account found with this email.';
      } else if (err.name === 'UserNotConfirmedException') {
        message = 'Please verify your email before signing in.';
      }

      setError('root.serverError', {
        type: 'manual',
        message,
      });
    }
  };

  // Handle hosted UI login (redirect to Cognito)
  const handleHostedLogin = async () => {
    try {
      if (!config.isCognitoConfigured) {
        throw new Error('Cognito is not configured. Please check environment variables.');
      }

      // Store current path for redirect after login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        sessionStorage.setItem('barkbase_return_path', currentPath);
      }

      // Redirect to Cognito Hosted UI
      await auth.signIn();
    } catch (err) {
      console.error('[Login] Hosted UI Error:', err);
      setError('root.serverError', {
        type: 'manual',
        message: err.message || 'Unable to start login. Please try again.',
      });
    }
  };

  // Determine which mode to use
  // 'embedded', 'password', 'cognito' (default) → show email/password form
  // 'hosted' → redirect to Cognito Hosted UI
  const isEmbeddedMode = config.authMode !== 'hosted' && config.authMode !== 'db';
  const isHostedMode = config.authMode === 'hosted';

  // Show configuration warning in development
  const showConfigWarning = !config.cognitoClientId && config.isDevelopment;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-gray-300 dark:text-text-secondary">
          BARKBASE
        </p>
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
      </div>
      
      <Card className="max-w-md p-6 w-full">
        <div className="grid gap-4">
          {/* Configuration Warning */}
          {showConfigWarning && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ Cognito not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in your .env file.
              </p>
            </div>
          )}

          {/* Error Display */}
          {errors.root?.serverError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.root.serverError.message}</p>
            </div>
          )}

          {/* Embedded Login Form (default) */}
          {isEmbeddedMode && (
            <form className="grid gap-4" onSubmit={handleSubmit(handleEmbeddedLogin)}>
              <label className="text-sm font-medium text-gray-900 dark:text-text-primary">
                Email
                <input
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm text-gray-900 dark:text-text-primary"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </label>
              
              <label className="text-sm font-medium text-gray-900 dark:text-text-primary">
                Password
                <input
                  type="password"
                  {...register('password', { required: 'Password is required' })}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm text-gray-900 dark:text-text-primary"
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </label>
              <Button 
                type="submit" 
                disabled={isSubmitting || !config.cognitoClientId}
                className="w-full"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          )}

          {/* Hosted UI Login Button (fallback) */}
          {isHostedMode && (
            <>
              <Button
                type="button"
                onClick={handleHostedLogin}
                disabled={isSubmitting || !config.isCognitoConfigured}
                className="w-full"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Redirecting...
                  </span>
                ) : (
                  'Sign In with Cognito'
                )}
              </Button>
              <p className="text-center text-xs text-gray-500 dark:text-text-secondary">
                You'll be redirected to our secure login page
              </p>
            </>
          )}

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-surface-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-surface-primary px-2 text-gray-500 dark:text-text-secondary">
                or
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-xs text-gray-500 dark:text-text-secondary">
            Don't have a workspace?{' '}
            <Link to="/signup" className="text-[color:var(--bb-color-accent-text)] underline hover:opacity-80">
              Create one
            </Link>
          </p>
        </div>
      </Card>

      {/* Environment Info (dev only) */}
      {config.isDevelopment && (
        <div className="mt-4 text-center text-xs text-gray-400 dark:text-text-secondary">
          <p>Auth Mode: {config.authMode}</p>
          <p>API: {config.apiBaseUrl}</p>
        </div>
      )}
    </div>
  );
};

export default Login;
