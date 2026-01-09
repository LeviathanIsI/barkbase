/**
 * =============================================================================
 * BarkBase Login Page - Premium SaaS Design
 * =============================================================================
 *
 * Modern login experience inspired by Linear, Vercel, and Stripe.
 * Features: gradient backgrounds, glassmorphism, glow effects, and depth.
 *
 * AUTH FLOW (Phase 6B - Embedded Mode):
 * -------------------------------------
 * Primary auth uses Barkbase's own embedded login form with direct Cognito
 * USER_PASSWORD_AUTH. Users enter email/password on this page, and we
 * authenticate directly against Cognito without redirecting to Hosted UI.
 *
 * =============================================================================
 */

import Button from '@/components/ui/Button';
import { config } from '@/config/env';
import { apiClient, auth } from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { Shield, Dog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';

// ============================================================================
// PREMIUM LOGO COMPONENT
// ============================================================================
const BarkBaseLogo = ({ className = '' }) => (
  <div className={`flex flex-col items-center ${className}`}>
    {/* Logomark with glow effect */}
    <div className="relative mb-4">
      {/* Glow layer */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 blur-xl opacity-50" />
      {/* Logo container */}
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/25">
        <Dog className="h-8 w-8 text-white" strokeWidth={1.5} />
      </div>
    </div>
    {/* Brand name */}
    <span className="text-sm font-semibold tracking-widest text-text-secondary uppercase">
      BarkBase
    </span>
  </div>
);

// ============================================================================
// PREMIUM INPUT COMPONENT
// ============================================================================
const PremiumInput = ({ label, error, className = '', ...props }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-text-primary">
      {label}
    </label>
    <input
      className={`
        w-full rounded-xl border bg-surface-1 px-4 py-3
        text-sm text-text-primary placeholder-text-tertiary
        transition-all duration-200
        border-[var(--border-subtle)]
        hover:border-[var(--border-default)]
        focus:outline-none focus:border-primary-500/50
        focus:ring-2 focus:ring-primary-500/20
        focus:shadow-[0_0_0_4px_rgba(245,158,11,0.1)]
        dark:bg-surface-1 dark:border-[var(--border-subtle)]
        dark:hover:border-[var(--border-default)]
        dark:focus:border-primary-400/50 dark:focus:ring-primary-400/20
        dark:focus:shadow-[0_0_20px_rgba(251,191,36,0.15)]
        ${error ? 'border-error-500 focus:border-error-500 focus:ring-error-500/20' : ''}
        ${className}
      `}
      {...props}
    />
    {error && (
      <p className="text-sm text-error-500">{error}</p>
    )}
  </div>
);

// ============================================================================
// PREMIUM BUTTON COMPONENT (extends base Button)
// ============================================================================
const PremiumButton = ({ children, loading, disabled, className = '', ...props }) => (
  <button
    disabled={disabled || loading}
    className={`
      relative w-full rounded-xl px-6 py-3.5 text-sm font-semibold
      transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed

      /* Gradient background */
      bg-gradient-to-r from-primary-500 to-primary-600
      hover:from-primary-400 hover:to-primary-500

      /* Text color */
      text-white

      /* Shadow and glow on hover */
      shadow-lg shadow-primary-500/25
      hover:shadow-xl hover:shadow-primary-500/30

      /* Glow effect on hover */
      hover:ring-4 hover:ring-primary-500/20

      /* Active state */
      active:scale-[0.98] active:shadow-md

      /* Focus state */
      focus:outline-none focus:ring-4 focus:ring-primary-500/30

      ${className}
    `}
    {...props}
  >
    {loading ? (
      <span className="flex items-center justify-center gap-2">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>{typeof children === 'string' ? children.replace('Sign In', 'Signing in...') : 'Loading...'}</span>
      </span>
    ) : (
      children
    )}
  </button>
);

// ============================================================================
// MAIN LOGIN COMPONENT
// ============================================================================
const Login = () => {
  const navigate = useNavigate();
  const { setAuth, updateTokens, isAuthenticated } = useAuthStore();
  const { setTenant, setLoading: setTenantLoading } = useTenantStore();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm();

  // MFA challenge state
  const [mfaChallenge, setMfaChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [isMfaSubmitting, setIsMfaSubmitting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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

      if (!config.cognitoClientId) {
        throw new Error('Cognito is not configured. Please check VITE_COGNITO_CLIENT_ID in your .env file.');
      }

      const result = await auth.signIn({ email, password });

      if (result.mfaRequired) {
        setMfaChallenge({
          session: result.session,
          email: result.email,
        });
        return;
      }

      if (!result || !result.accessToken) {
        throw new Error('Authentication failed - no access token received');
      }

      // Call backend to create session record
      try {
        const loginResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/login`, { // eslint-disable-line no-restricted-syntax
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: result.accessToken,
            idToken: result.idToken,
          }),
        });
        if (!loginResponse.ok) {
          console.warn('[Login] Backend login call failed:', loginResponse.status);
        }
      } catch (backendError) {
        console.warn('[Login] Failed to create backend session:', backendError.message);
      }

      const userInfo = result.idToken ? decodeIdToken(result.idToken) : { email };

      if (result.refreshToken) {
        try {
          sessionStorage.setItem('barkbase_refresh_token', result.refreshToken);
        } catch {
          console.warn('[Login] Could not store refresh token');
        }
      }

      // Bootstrap tenant config
      setTenantLoading(true);
      let tenantConfig = null;
      try {
        const tenantResponse = await fetch(`${import.meta.env.VITE_API_URL}${canonicalEndpoints.settings.tenant}`, { // eslint-disable-line no-restricted-syntax
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.accessToken}`,
          },
        });
        if (tenantResponse.ok) {
          tenantConfig = await tenantResponse.json();
        }
      } catch (tenantError) {
        console.warn('[Login] Failed to bootstrap tenant config:', tenantError.message);
      } finally {
        setTenantLoading(false);
      }

      const finalUserInfo = tenantConfig?.user?.name
        ? { ...userInfo, name: tenantConfig.user.name }
        : userInfo;

      setAuth({
        user: finalUserInfo,
        accessToken: result.accessToken,
        tenantId: tenantConfig?.tenantId || tenantConfig?.recordId || null,
        role: tenantConfig?.user?.role || null,
      });

      if (tenantConfig) {
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
      }

      const returnPath = sessionStorage.getItem('barkbase_return_path') || '/today';
      sessionStorage.removeItem('barkbase_return_path');
      navigate(returnPath, { replace: true });
    } catch (err) {
      console.error('[Login] Error:', err);

      let message = err.message || 'Unable to sign in. Please try again.';
      if (err.name === 'NotAuthorizedException') {
        message = 'Invalid email or password.';
      } else if (err.name === 'UserNotFoundException') {
        message = 'No account found with this email.';
      } else if (err.name === 'UserNotConfirmedException') {
        message = 'Please verify your email before signing in.';
      }

      setError('root.serverError', { type: 'manual', message });
    }
  };

  // Handle hosted UI login
  const handleHostedLogin = async () => {
    try {
      if (!config.isCognitoConfigured) {
        throw new Error('Cognito is not configured. Please check environment variables.');
      }
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        sessionStorage.setItem('barkbase_return_path', currentPath);
      }
      await auth.signIn();
    } catch (err) {
      console.error('[Login] Hosted UI Error:', err);
      setError('root.serverError', {
        type: 'manual',
        message: err.message || 'Unable to start login. Please try again.',
      });
    }
  };

  // Handle MFA code submission
  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    if (!mfaChallenge || mfaCode.length !== 6) return;

    setIsMfaSubmitting(true);
    setMfaError('');

    try {
      const result = await auth.respondToMfaChallenge({
        session: mfaChallenge.session,
        code: mfaCode,
        email: mfaChallenge.email,
      });

      if (!result || !result.accessToken) {
        throw new Error('MFA verification failed');
      }

      setIsAuthenticating(true);
      setIsMfaSubmitting(false);

      try {
        const loginResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/login`, { // eslint-disable-line no-restricted-syntax
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: result.accessToken,
            idToken: result.idToken,
          }),
        });
        if (!loginResponse.ok) {
          console.warn('[Login] Backend login call failed:', loginResponse.status);
        }
      } catch (backendError) {
        console.warn('[Login] Failed to create backend session:', backendError.message);
      }

      const userInfo = result.idToken ? decodeIdToken(result.idToken) : { email: mfaChallenge.email };

      if (result.refreshToken) {
        try {
          sessionStorage.setItem('barkbase_refresh_token', result.refreshToken);
        } catch {
          console.warn('[Login] Could not store refresh token');
        }
      }

      setTenantLoading(true);
      let tenantConfig = null;
      try {
        const tenantResponse = await fetch(`${import.meta.env.VITE_API_URL}${canonicalEndpoints.settings.tenant}`, { // eslint-disable-line no-restricted-syntax
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.accessToken}`,
          },
        });
        if (tenantResponse.ok) {
          tenantConfig = await tenantResponse.json();
        }
      } catch (tenantError) {
        console.warn('[Login] Failed to bootstrap tenant config:', tenantError.message);
      } finally {
        setTenantLoading(false);
      }

      const finalUserInfo = tenantConfig?.user?.name
        ? { ...userInfo, name: tenantConfig.user.name }
        : userInfo;

      setAuth({
        user: finalUserInfo,
        accessToken: result.accessToken,
        tenantId: tenantConfig?.tenantId || tenantConfig?.recordId || null,
        role: tenantConfig?.user?.role || null,
      });

      if (tenantConfig) {
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
      }

      const returnPath = sessionStorage.getItem('barkbase_return_path') || '/today';
      sessionStorage.removeItem('barkbase_return_path');
      navigate(returnPath, { replace: true });

    } catch (err) {
      console.error('[Login] MFA Error:', err);
      setMfaError(err.message || 'Invalid verification code. Please try again.');
      setIsAuthenticating(false);
      setIsMfaSubmitting(false);
    }
  };

  const handleMfaCancel = () => {
    setMfaChallenge(null);
    setMfaCode('');
    setMfaError('');
  };

  const isEmbeddedMode = config.authMode !== 'hosted' && config.authMode !== 'db';
  const isHostedMode = config.authMode === 'hosted';
  const showConfigWarning = !config.cognitoClientId && config.isDevelopment;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* ================================================================
          PREMIUM BACKGROUND
          ================================================================ */}

      {/* Base gradient background */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800"
        style={{
          background: 'var(--gradient-atmospheric)',
        }}
      />

      {/* Mesh gradient overlay - subtle purple/blue/orange tint */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% -20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 120%, rgba(59, 130, 246, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 50% 50%, rgba(245, 158, 11, 0.05) 0%, transparent 60%)
          `,
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Soft glow in top-left corner */}
      <div
        className="absolute -top-40 -left-40 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
        }}
      />

      {/* Soft glow in bottom-right corner */}
      <div
        className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full opacity-15 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%)',
        }}
      />

      {/* ================================================================
          MAIN CONTENT
          ================================================================ */}
      <div className="relative z-10 w-full max-w-md px-6 py-12">

        {/* Logo */}
        <BarkBaseLogo className="mb-10" />

        {/* Card with glassmorphism */}
        <div
          className="
            relative overflow-hidden rounded-2xl p-8
            backdrop-blur-xl
            border border-white/[0.08]
            shadow-2xl shadow-black/20
          "
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
          }}
        >
          {/* Subtle gradient overlay on card */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(245, 158, 11, 0.05) 0%, transparent 50%)',
            }}
          />

          {/* Card content */}
          <div className="relative">
            {/* Headline */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold text-text-primary">
                Sign in to your workspace
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Manage your facility with ease
              </p>
            </div>

            {/* MFA Challenge UI */}
            {mfaChallenge || isAuthenticating ? (
              isAuthenticating ? (
                /* Signing in animation */
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
                    <span className="animate-spin rounded-full h-10 w-10 border-4 border-primary-400 border-t-transparent" />
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">Signing you in...</h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Setting up your workspace
                  </p>
                </div>
              ) : (
                /* MFA code entry */
                <form onSubmit={handleMfaSubmit} className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 border border-primary-500/30">
                      <Shield className="h-7 w-7 text-primary-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-text-primary">Two-Factor Authentication</h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  {mfaError && (
                    <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/30">
                      <p className="text-sm text-error-400">{mfaError}</p>
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="
                        w-full rounded-xl border bg-surface-1 px-4 py-4
                        text-center text-2xl font-mono tracking-[0.5em]
                        text-text-primary placeholder-text-tertiary
                        transition-all duration-200
                        border-[var(--border-subtle)]
                        focus:outline-none focus:border-primary-500/50
                        focus:ring-2 focus:ring-primary-500/20
                        focus:shadow-[0_0_20px_rgba(251,191,36,0.15)]
                      "
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </div>

                  <PremiumButton type="submit" loading={isMfaSubmitting} disabled={mfaCode.length !== 6}>
                    Verify
                  </PremiumButton>

                  <button
                    type="button"
                    onClick={handleMfaCancel}
                    className="w-full text-center text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Back to login
                  </button>
                </form>
              )
            ) : (
              <>
                {/* Configuration Warning */}
                {showConfigWarning && (
                  <div className="mb-6 p-4 rounded-xl bg-warning-500/10 border border-warning-500/30">
                    <p className="text-sm text-warning-400">
                      Cognito not configured. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID in your .env file.
                    </p>
                  </div>
                )}

                {/* Error Display */}
                {errors.root?.serverError && (
                  <div className="mb-6 p-4 rounded-xl bg-error-500/10 border border-error-500/30">
                    <p className="text-sm text-error-400">{errors.root.serverError.message}</p>
                  </div>
                )}

                {/* Embedded Login Form */}
                {isEmbeddedMode && (
                  <form className="space-y-5" onSubmit={handleSubmit(handleEmbeddedLogin)}>
                    <PremiumInput
                      label="Email"
                      type="email"
                      {...register('email', { required: 'Email is required' })}
                      placeholder="you@example.com"
                      autoComplete="email"
                      error={errors.email?.message}
                    />

                    <PremiumInput
                      label="Password"
                      type="password"
                      {...register('password', { required: 'Password is required' })}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      error={errors.password?.message}
                    />

                    <div className="pt-2">
                      <PremiumButton
                        type="submit"
                        loading={isSubmitting}
                        disabled={!config.cognitoClientId}
                      >
                        Sign In
                      </PremiumButton>
                    </div>
                  </form>
                )}

                {/* Hosted UI Login Button */}
                {isHostedMode && (
                  <div className="space-y-4">
                    <PremiumButton
                      type="button"
                      onClick={handleHostedLogin}
                      loading={isSubmitting}
                      disabled={!config.isCognitoConfigured}
                    >
                      Sign In with Cognito
                    </PremiumButton>
                    <p className="text-center text-xs text-text-tertiary">
                      You'll be redirected to our secure login page
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.08]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-transparent px-3 text-text-tertiary backdrop-blur-sm">
                      or
                    </span>
                  </div>
                </div>

                {/* Sign Up Link */}
                <p className="text-center text-sm text-text-secondary">
                  Don't have a workspace?{' '}
                  <Link
                    to="/signup"
                    className="font-medium text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Create one
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-text-tertiary">
          By signing in, you agree to our{' '}
          <a href="#" className="text-text-secondary hover:text-text-primary transition-colors">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-text-secondary hover:text-text-primary transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
