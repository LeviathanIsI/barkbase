/**
 * =============================================================================
 * BarkBase Signup Page
 * =============================================================================
 *
 * Creates a new BarkBase workspace (tenant) with the first user as OWNER.
 *
 * AUTHENTICATION:
 * ---------------
 * This page uses Cognito-based authentication (the only supported production mode).
 *
 * - AUTH_MODE='embedded' (default/recommended): CognitoPasswordClient creates
 *   user in Cognito, then calls /api/v1/auth/register to create tenant/user
 *   records in the database.
 *
 * - AUTH_MODE='hosted': LambdaAuthClient redirects to Cognito Hosted UI.
 *   User creation happens after OAuth callback.
 *
 * NOTE: DB auth mode is LEGACY/DEV-ONLY and blocked in production builds.
 * See aws-client/index.js and aws-client/db-auth-client.js for details.
 *
 * =============================================================================
 */

import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { auth } from '@/lib/apiClient';

const Signup = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTenant = useTenantStore((state) => state.setTenant);

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acknowledgeAwsHosting, setAcknowledgeAwsHosting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Password validation
  const passwordsMatch = password === confirmPassword;
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;

  const slugHint = tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (isAuthenticated) {
    return <Navigate to="/today" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const signUpResponse = await auth.signUp({
        email,
        password,
        tenantName,
        tenantSlug: tenantSlug || slugHint,
        name: email.split('@')[0]
      });

      // Check if user needs email verification (no tokens returned)
      if (signUpResponse.needsVerification) {
        setSuccess({
          email,
          tenant: signUpResponse.tenant || { name: tenantName, slug: tenantSlug || slugHint },
          message: signUpResponse.message,
        });
        return;
      }

      // Only set auth and navigate if we have tokens
      if (!signUpResponse.accessToken) {
        throw new Error('Registration succeeded but no access token received. Please try logging in.');
      }

      setAuth({
        user: signUpResponse.user,
        accessToken: signUpResponse.accessToken,
        refreshToken: signUpResponse.refreshToken,
        role: 'OWNER',
        tenantId: signUpResponse.tenant?.id || signUpResponse.tenant?.recordId,
        accountCode: signUpResponse.tenant?.accountCode,
        memberships: [{ role: 'OWNER', tenantId: signUpResponse.tenant?.id || signUpResponse.tenant?.recordId }],
        rememberMe: true,
      });

      setTenant({
        recordId: signUpResponse.tenant?.id || signUpResponse.tenant?.recordId,
        slug: signUpResponse.tenant?.slug,
        name: signUpResponse.tenant?.name,
        plan: signUpResponse.tenant?.plan || 'FREE',
        accountCode: signUpResponse.tenant?.accountCode,
      });

      navigate('/today');
    } catch (err) {
      setError(err.message ?? 'Unable to create workspace');
    } finally {
      setSubmitting(false);
    }
  };

  const loginHref = success?.tenant?.slug
    ? `/login?tenant=${encodeURIComponent(success.tenant.slug)}`
    : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-text-tertiary">BarkBase</p>
        <h1 className="text-2xl font-semibold text-white">Create your BarkBase workspace</h1>
        <p className="mt-2 text-sm text-gray-300 dark:text-text-tertiary">Start on the free plan. Upgrade whenever you're ready.</p>
      </div>
      <Card className="w-full max-w-xl p-6">
        {success ? (
          <div className="space-y-4 text-sm text-gray-900 dark:text-text-primary">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-text-primary">Verify your email</h2>
            <p>
              We've sent a verification link to <strong>{success.email}</strong>. Click the link to activate your
              workspace <strong>{success.tenant.name}</strong> and sign in.
            </p>
            <p>
              Workspace slug: <span className="font-mono text-xs uppercase">{success.tenant.slug}</span>
            </p>
            {success.verification?.token ? (
              <div className="rounded-lg border border-yellow-500/60 bg-yellow-50 dark:bg-yellow-950/10 p-4 text-left text-sm text-yellow-700">
                <p className="font-semibold">Need a quick way to verify?</p>
                <p className="mt-1">
                  Email couldn't be delivered. Use this link instead:
                  <br />
                  <Link
                    to={`/verify-email?token=${success.verification.token}`}
                    className="break-all font-mono text-xs text-yellow-700 underline"
                  >
                    {`${window.location.origin}/verify-email?token=${success.verification.token}`}
                  </Link>
                </p>
              </div>
            ) : null}
            <p className="text-gray-600 dark:text-text-secondary">
              Didn't receive it? Check your spam folder or request another link from the sign-in screen once the
              first expires.
            </p>
            <Button asChild>
              <Link to={loginHref}>Return to sign in</Link>
            </Button>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Input
              label="Workspace name"
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Acme Boarding"
              required
            />
            <Input
              label="Workspace slug"
              type="text"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
              placeholder={slugHint || 'acme-boarding'}
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title="Lowercase letters, numbers, and hyphens only"
              helpText={`This becomes your tenant slug (e.g. ${tenantSlug || slugHint || 'acme-boarding'}.barkbase.app)`}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Use at least 12 characters, incl. symbol"
              minLength={12}
              helpText="Must include upper & lower case letters, a number, and a symbol."
              required
            />
            <div className="w-full space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Confirm password
                <span style={{ color: 'var(--bb-color-status-negative)' }} className="ml-1">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                minLength={12}
                required
                className="flex h-11 w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-base,1rem)] font-[var(--bb-font-weight-regular,400)] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  borderColor: showPasswordMismatch ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
                  color: 'var(--bb-color-text-primary)',
                }}
              />
              <p
                className="text-[var(--bb-font-size-sm,0.875rem)] h-5 transition-opacity duration-150"
                style={{
                  color: showPasswordMismatch ? 'var(--bb-color-status-negative)' : 'transparent',
                }}
              >
                {showPasswordMismatch ? 'Passwords do not match' : '\u00A0'}
              </p>
            </div>
            <label className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary p-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledgeAwsHosting}
                onChange={(event) => setAcknowledgeAwsHosting(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 dark:border-surface-border text-primary-600 focus:ring-2 focus:ring-primary-500"
                required
              />
              <span className="text-left text-xs text-gray-600 dark:text-text-secondary">
                I understand BarkBase stores my workspace on AWS-managed infrastructure and that plan limits control
                retention and capacity. I will export data regularly if I need additional backups.
              </span>
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex items-center justify-between gap-3">
              <Button type="submit" disabled={submitting || !acknowledgeAwsHosting || showPasswordMismatch}>
                {submitting ? 'Creating workspace…' : 'Create workspace'}
              </Button>
              <Link to="/login" className="text-sm text-primary-600 underline">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default Signup;
