import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { auth, apiClient } from '@/lib/apiClient';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { setTenant, setLoading } = useTenantStore();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, watch } = useForm();
  const [rememberMe, setRememberMe] = useState(true);

  const email = watch('email');
  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      const { email, password } = data;
      const result = await auth.signIn({ email, password });

      if (result?.accessToken) {
        // Decode JWT to extract user information (no tenant info in JWT)
        let userInfo = null;

        try {
          const decoded = jwtDecode(result.accessToken);
          userInfo = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded['custom:role'] || decoded.role,
          };
        } catch (jwtError) {
          console.error('[Login] Failed to decode JWT:', jwtError);
        }

        // Set auth state with tokens first (tenant will be populated below)
        setAuth({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tenantId: null, // Will be populated after fetching tenant
          user: userInfo,
          rememberMe,
        });

        // Check if tenant is already being loaded
        const { isLoading } = useTenantStore.getState();
        if (isLoading) {
          console.log('[Login] Tenant already being loaded by another component, skipping...');
          navigate('/dashboard');
          return;
        }

        // ALWAYS fetch tenant from backend (uses JWT sub to find tenant via database)
        // Backend extracts Cognito sub from JWT → queries User table → gets tenant
        setLoading(true);
        try {
          console.log('[Login] Fetching tenant from backend using JWT sub...');
          const tenantResponse = await apiClient.get('/api/v1/tenants/current');
          
          if (tenantResponse.data) {
            const tenantData = tenantResponse.data;
            console.log('[Login] Tenant fetched successfully:', tenantData.recordId);

            // Update auth store with the tenantId from backend
            setAuth({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              tenantId: tenantData.recordId,
              user: userInfo,
              rememberMe,
            });

            // Set full tenant object
            setTenant(tenantData);
          }
        } catch (tenantError) {
          console.error('[Login] Failed to fetch tenant from backend:', tenantError);
          // Don't block login if tenant fetch fails - user can still access some pages
        } finally {
          setLoading(false);
        }

        navigate('/dashboard');
      }
      return;
    } catch (error) {
      console.error('Login failed:', error);
      setError('root.serverError', {
        type: 'manual',
        message: error.message || 'Unable to sign in. Please try again.',
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-text-tertiary">BARKBASE</p>
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
      </div>
      <Card className="max-w-md p-6">
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="text-sm font-medium text-gray-900 dark:text-text-primary">
            Email
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm text-gray-900 dark:text-text-primary"
              autoComplete="email"
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </label>
          <label className="text-sm font-medium text-gray-900 dark:text-text-primary">
            Password
            <input
              type="password"
              {...register('password', { required: 'Password is required' })}
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-surface-border bg-white dark:bg-surface-primary px-3 py-2 text-sm text-gray-900 dark:text-text-primary"
              autoComplete="current-password"
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-text-primary">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-surface-border text-primary-600 focus:ring-2 focus:ring-primary-500"
            />
            <span>Remember me for 30 days</span>
          </label>
          {errors.root?.serverError ? <p className="text-sm text-red-600">{errors.root.serverError.message}</p> : null}
          <Button type="submit" disabled={isSubmitting || !email}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
          <p className="text-center text-xs text-gray-500 dark:text-text-secondary">
            Don't have a workspace?{' '}
            <Link to="/signup" className="text-primary-600 hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default Login;
