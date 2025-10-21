import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { auth } from '@/lib/apiClient'; // Import the new auth client
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { setTenant } = useTenantStore();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, watch } = useForm();
  const [rememberMe, setRememberMe] = useState(true); // Default to true

  const email = watch('email');
  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      const { email, password } = data;
      console.log('Attempting sign in...');
      
      const result = await auth.signIn({ email, password });
      
      // Store auth tokens and user info
      setAuth({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        role: result.user.role,
        tenantId: result.tenant.recordId,
        memberships: [{ role: result.user.role, tenantId: result.tenant.recordId }],
        rememberMe,
      });

      // Store tenant info
      setTenant({
        recordId: result.tenant.recordId,
        slug: result.tenant.slug,
        name: result.tenant.name,
        plan: result.tenant.plan,
      });
      
      console.log('Sign in successful, navigating to dashboard...');
      navigate('/dashboard');

    } catch (error) {
      console.error('Login failed:', error);
      setError('root.serverError', {
        type: 'manual',
        message: error.message || 'Invalid credentials. Please try again.',
      });
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted">BARKBASE</p>
        <h1 className="text-2xl font-semibold text-text">Welcome back</h1>
      </div>
      <Card className="max-w-md">
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="text-sm font-medium text-text">
            Email
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              autoComplete="email"
            />
            {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
          </label>
          <label className="text-sm font-medium text-text">
            Password
            <input
              type="password"
              {...register('password', { required: 'Password is required' })}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              autoComplete="current-password"
            />
            {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
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
          {errors.root?.serverError ? <p className="text-sm text-danger">{errors.root.serverError.message}</p> : null}
          <Button type="submit" disabled={isSubmitting || !email || !password}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
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
