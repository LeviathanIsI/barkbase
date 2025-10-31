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
      // Supports both modes: hosted (redirect) and password (returns tokens)
      const result = await auth.signIn({ email, password });
      if (result?.accessToken) {
        setAuth({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          rememberMe,
        });
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
        <p className="text-xs uppercase tracking-wide text-gray-400">BARKBASE</p>
        <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
      </div>
      <Card className="max-w-md p-6">
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <label className="text-sm font-medium text-gray-900">
            Email
            <input
              type="email"
              {...register('email', { required: 'Email is required' })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              autoComplete="email"
            />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </label>
          <label className="text-sm font-medium text-gray-900">
            Password
            <input
              type="password"
              {...register('password', { required: 'Password is required' })}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
              autoComplete="current-password"
            />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-900">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
            />
            <span>Remember me for 30 days</span>
          </label>
          {errors.root?.serverError ? <p className="text-sm text-red-600">{errors.root.serverError.message}</p> : null}
          <Button type="submit" disabled={isSubmitting || !email}>
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </Button>
          <p className="text-center text-xs text-gray-500">
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
