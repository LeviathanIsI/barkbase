import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { apiClient } from '@/lib/apiClient';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTenant = useTenantStore((state) => state.setTenant);
  const [status, setStatus] = useState({ state: 'pending' });

  useEffect(() => {
    if (!token) {
      setStatus({ state: 'error', message: 'Missing verification token.' });
      return;
    }

    let cancelled = false;

    const mutate = async () => {
      try {
        const result = await apiClient('/api/v1/auth/verify-email', {
          method: 'POST',
          body: { token },
        });
        if (cancelled) return;
        setTenant(result.tenant);
        setAuth({
          user: result.user,
          tokens: result.tokens,
          role: result.user?.role,
          tenantId: result.tenant.recordId,
          memberships: result.user?.memberships,
        });
        setStatus({ state: 'success' });
        setTimeout(() => {
          if (!cancelled) {
            navigate('/dashboard', { replace: true });
          }
        }, 1500);
      } catch (error) {
        if (!cancelled) {
          setStatus({ state: 'error', message: error.message ?? 'Verification failed.' });
        }
      }
    };

    mutate();

    return () => {
      cancelled = true;
    };
  }, [navigate, setAuth, setTenant, token]);

  if (isAuthenticated && status.state === 'success') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg text-center">
        {status.state === 'pending' ? (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold text-text">Verifying your email…</h1>
            <p className="text-sm text-muted">Hang tight while we confirm your workspace.</p>
          </div>
        ) : null}
        {status.state === 'success' ? (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold text-text">All set!</h1>
            <p className="text-sm text-muted">Your workspace is ready. Redirecting to your dashboard…</p>
            <Button onClick={() => navigate('/dashboard', { replace: true })}>Go to dashboard now</Button>
          </div>
        ) : null}
        {status.state === 'error' ? (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold text-danger">Verification failed</h1>
            <p className="text-sm text-muted">{status.message}</p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate('/signup', { replace: true })}>
                Try again
              </Button>
              <Button onClick={() => navigate('/login', { replace: true })}>Back to sign in</Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
};

export default VerifyEmail;
