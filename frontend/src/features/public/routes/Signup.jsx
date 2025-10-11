import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';

const Signup = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTenant = useTenantStore((state) => state.setTenant);

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [acknowledgeSupabaseHosting, setAcknowledgeSupabaseHosting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient('/api/v1/auth/signup', {
        method: 'POST',
        body: { tenantName, tenantSlug, email, password, honeypot, acknowledgeSupabaseHosting },
      });

      if (result.tokens) {
        setTenant(result.tenant);
        setAuth({
          user: result.user,
          tokens: result.tokens,
          role: result.user?.role ?? 'OWNER',
          tenantId: result.tenant.id,
          memberships: result.user?.memberships,
        });
        navigate('/dashboard', { replace: true });
        return;
      }

      if (result.tenant) {
        setTenant(result.tenant);
      }
      setSuccess({ tenant: result.tenant, email: result.user.email, verification: result.verification });
      setTenantName('');
      setTenantSlug('');
      setEmail('');
      setPassword('');
      setAcknowledgeSupabaseHosting(false);
    } catch (err) {
      setError(err.message ?? 'Unable to create workspace');
    } finally {
      setSubmitting(false);
    }
  };

  const slugHint = tenantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const loginHref = success?.tenant?.slug
    ? `/login?tenant=${encodeURIComponent(success.tenant.slug)}`
    : '/login';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted">BarkBase</p>
        <h1 className="text-2xl font-semibold text-text">Create your BarkBase workspace</h1>
        <p className="mt-2 text-sm text-muted">Start on the free plan. Upgrade whenever you’re ready.</p>
      </div>
      <Card className="w-full max-w-xl">
        {success ? (
          <div className="space-y-4 text-sm text-text">
            <h2 className="text-lg font-semibold text-text">Verify your email</h2>
            <p>
              We've sent a verification link to <strong>{success.email}</strong>. Click the link to activate your
              workspace <strong>{success.tenant.name}</strong> and sign in.
            </p>
            <p>
              Workspace slug: <span className="font-mono text-xs uppercase">{success.tenant.slug}</span>
            </p>
            {success.verification?.token ? (
              <div className="rounded-lg border border-warning/60 bg-warning/10 p-4 text-left text-sm text-warning">
                <p className="font-semibold">Need a quick way to verify?</p>
                <p className="mt-1">
                  Email couldn't be delivered. Use this link instead:
                  <br />
                  <Link
                    to={`/verify-email?token=${success.verification.token}`}
                    className="break-all font-mono text-xs text-warning underline"
                  >
                    {`${window.location.origin}/verify-email?token=${success.verification.token}`}
                  </Link>
                </p>
              </div>
            ) : null}
            <p className="text-muted">
              Didn't receive it? Check your spam folder or request another link from the sign-in screen once the
              first expires.
            </p>
            <Button asChild>
              <Link to={loginHref}>Return to sign in</Link>
            </Button>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <input
              type="text"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />
            <label className="text-sm font-medium text-text">
              Workspace name
              <input
                type="text"
                value={tenantName}
                onChange={(event) => setTenantName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="Acme Boarding"
                required
              />
            </label>
            <label className="text-sm font-medium text-text">
              Workspace slug
              <input
                type="text"
                value={tenantSlug}
                onChange={(event) => setTenantSlug(event.target.value.toLowerCase())}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder={slugHint || 'acme-boarding'}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                title="Lowercase letters, numbers, and hyphens only"
                required
              />
              <span className="mt-1 block text-xs text-muted">
                This becomes your tenant slug (e.g. {tenantSlug || slugHint || 'acme-boarding'}.barkbase.app)
              </span>
            </label>
            <label className="text-sm font-medium text-text">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                autoComplete="email"
                required
              />
            </label>
            <label className="text-sm font-medium text-text">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                placeholder="Use at least 12 characters, incl. symbol"
                minLength={12}
                required
              />
              <span className="mt-1 block text-xs text-muted">
                Must include upper & lower case letters, a number, and a symbol.
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-border/70 bg-surface/80 p-3 text-sm">
              <input
                type="checkbox"
                checked={acknowledgeSupabaseHosting}
                onChange={(event) => setAcknowledgeSupabaseHosting(event.target.checked)}
                className="mt-1 h-4 w-4"
                required
              />
              <span className="text-left text-xs text-muted">
                I understand BarkBase stores my workspace on Supabase-managed infrastructure and that plan limits control
                retention and capacity. I will export data regularly if I need additional backups.
              </span>
            </label>
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="flex items-center justify-between gap-3">
              <Button type="submit" disabled={submitting || !acknowledgeSupabaseHosting}>
                {submitting ? 'Creating workspace…' : 'Create workspace'}
              </Button>
              <Link to="/login" className="text-sm text-primary underline">
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
