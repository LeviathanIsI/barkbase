import { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { apiClient } from '@/lib/apiClient';

const Login = () => {
  const setTenant = useTenantStore((state) => state.setTenant);
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default to checked
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient('/api/v1/auth/login', {
        method: 'POST',
        body: { email, password, rememberMe },
      });

      // Update tenant store with full tenant info from login response
      if (result.user?.memberships?.[0]?.tenant) {
        setTenant(result.user.memberships[0].tenant);
      }

      setAuth({
        user: result.user,
        tokens: result.tokens,
        role: result.role ?? result.user?.role,
        tenantId: result.tenantId ?? result.user?.tenantId,
        memberships: result.user?.memberships,
        rememberMe,
      });

      const from = location.state?.from;
      const redirectTo = from
        ? `${from.pathname ?? ''}${from.search ?? ''}${from.hash ?? ''}` || '/dashboard'
        : '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Check if it's a "no workspace" error
      if (err.message && err.message.includes('No workspace found')) {
        setError(
          <span>
            {err.message}{' '}
            <Link to="/signup" className="text-primary underline">
              Create a new workspace
            </Link>
          </span>
        );
      } else {
        setError(err.message ?? 'Unable to sign in');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted">BARKBASE</p>
        <h1 className="text-2xl font-semibold text-text">Welcome back</h1>
      </div>
      <Card className="max-w-md">
        <form className="grid gap-4" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              required
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary"
            />
            <span>Remember me for 30 days</span>
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting || !email || !password}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>
          <p className="text-center text-xs text-muted">
            Don't have a workspace?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default Login;
