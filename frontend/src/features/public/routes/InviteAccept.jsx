/**
 * =============================================================================
 * BarkBase Invite Accept Page
 * =============================================================================
 *
 * Allows invited users to accept an invitation and join an existing tenant.
 * URL: /invite?token=xxx
 *
 * Flow:
 * 1. Validate invitation token via GET /api/v1/auth/invite/:token
 * 2. Show invitation details (tenant name, role, email)
 * 3. User enters name and password
 * 4. Submit to POST /api/v1/auth/register with invitationToken
 *
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Building2, Shield, Mail } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { auth, apiClient } from '@/lib/apiClient';

const InviteAccept = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const setAuth = useAuthStore((state) => state.setAuth);
  const setTenant = useTenantStore((state) => state.setTenant);

  // Invitation validation state
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Password validation
  const passwordsMatch = password === confirmPassword;
  const showPasswordMismatch = confirmPassword.length > 0 && !passwordsMatch;

  // Validate invitation token on mount
  useEffect(() => {
    const validateInvitation = async () => {
      if (!token) {
        setValidationError('No invitation token provided');
        setLoading(false);
        return;
      }

      try {
        const { data } = await apiClient.get(`/api/v1/auth/invite/${token}`);
        if (data.valid) {
          setInvitation(data.invitation);
        } else {
          setValidationError('Invalid invitation');
        }
      } catch (err) {
        const message = err.response?.data?.message || err.message || 'Invalid or expired invitation';
        setValidationError(message);
      } finally {
        setLoading(false);
      }
    };

    validateInvitation();
  }, [token]);

  // Redirect if already authenticated
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
        email: invitation.email,
        password,
        name,
        invitationToken: token,
      });

      // Check if user needs email verification
      if (signUpResponse.needsVerification) {
        setError(signUpResponse.message || 'Please check your email to verify your account.');
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
        role: signUpResponse.user?.role || invitation.role,
        tenantId: signUpResponse.tenant?.id || signUpResponse.tenant?.recordId,
        accountCode: signUpResponse.tenant?.accountCode,
        memberships: [{ role: signUpResponse.user?.role || invitation.role, tenantId: signUpResponse.tenant?.id }],
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
      setError(err.message ?? 'Unable to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted">Validating invitation...</p>
      </div>
    );
  }

  // Error state
  if (validationError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-text mb-2">Invalid Invitation</h1>
          <p className="text-sm text-muted mb-4">{validationError}</p>
          <p className="text-xs text-muted mb-6">
            This invitation may have expired or already been used.
            Please contact your team admin for a new invitation.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Create New Workspace</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-6 text-center">
        <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-text-tertiary">BarkBase</p>
        <h1 className="text-2xl font-semibold text-white">You've been invited!</h1>
        <p className="mt-2 text-sm text-gray-300 dark:text-text-tertiary">
          Join <span className="font-medium text-white">{invitation.tenantName}</span> on BarkBase
        </p>
      </div>

      <Card className="w-full max-w-md p-6">
        {/* Invitation Details */}
        <div className="mb-6 p-4 bg-surface-secondary rounded-lg border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">{invitation.tenantName}</p>
              <p className="text-xs text-muted">Workspace</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted" />
              <span className="text-muted truncate">{invitation.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted" />
              <span className="text-muted capitalize">{invitation.role?.toLowerCase()}</span>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            label="Your name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Use at least 14 characters"
            minLength={14}
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
              minLength={14}
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

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" disabled={submitting || showPasswordMismatch || !name || !password}>
            {submitting ? 'Creating account...' : 'Accept Invitation'}
          </Button>

          <p className="text-xs text-center text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
};

export default InviteAccept;
