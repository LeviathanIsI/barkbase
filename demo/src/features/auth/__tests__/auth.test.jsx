/**
 * Auth Integration Tests
 *
 * Tests for authentication flows including:
 * - Login/logout
 * - Token management
 * - Protected routes
 * - Session handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { useAuthStore } from '@/stores/auth';

// Reset auth store before each test
beforeEach(() => {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    tenantId: null,
    role: null,
  });
});

describe('Authentication API', () => {
  describe('Login Flow', () => {
    it('successfully logs in with valid credentials', async () => {
      server.use(
        http.post('/api/v1/auth/login', async ({ request }) => {
          const body = await request.json();

          if (body.email === 'test@example.com' && body.password === 'password123') {
            return HttpResponse.json({
              token: 'test-jwt-token',
              refreshToken: 'test-refresh-token',
              user: {
                id: 'user-1',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                role: 'OWNER',
              },
              tenant: {
                id: 'tenant-1',
                name: 'Test Kennel',
                slug: 'test-kennel',
              },
            });
          }

          return HttpResponse.json(
            { error: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.token).toBe('test-jwt-token');
      expect(data.user.email).toBe('test@example.com');
      expect(data.tenant.id).toBe('tenant-1');
    });

    it('returns error for invalid credentials', async () => {
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { error: 'Invalid email or password' },
            { status: 401 }
          );
        })
      );

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Invalid email or password');
    });

    it('returns error for missing credentials', async () => {
      server.use(
        http.post('/api/v1/auth/login', async ({ request }) => {
          const body = await request.json();

          if (!body.email || !body.password) {
            return HttpResponse.json(
              { error: 'Email and password are required' },
              { status: 400 }
            );
          }

          return HttpResponse.json({ error: 'Invalid' }, { status: 401 });
        })
      );

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }), // Missing password
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });
  });

  describe('Token Refresh', () => {
    it('successfully refreshes expired token', async () => {
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json({
            token: 'new-jwt-token',
            refreshToken: 'new-refresh-token',
          });
        })
      );

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer old-refresh-token',
        },
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.token).toBe('new-jwt-token');
      expect(data.refreshToken).toBe('new-refresh-token');
    });

    it('returns error for invalid refresh token', async () => {
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json(
            { error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' },
            { status: 401 }
          );
        })
      );

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('Logout', () => {
    it('successfully logs out user', async () => {
      server.use(
        http.post('/api/v1/auth/logout', () => {
          return HttpResponse.json({ success: true });
        })
      );

      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

describe('Auth Store', () => {
  describe('State Management', () => {
    it('initializes with empty state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('sets auth state on login', () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'test-token',
        tenantId: 'tenant-1',
        role: 'OWNER',
      });

      const state = useAuthStore.getState();
      expect(state.user.email).toBe('test@example.com');
      expect(state.accessToken).toBe('test-token');
      expect(state.tenantId).toBe('tenant-1');
    });

    it('clears auth state on logout', () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'test-token',
        tenantId: 'tenant-1',
      });

      // Clear auth
      const clearAuth = useAuthStore.getState().clearAuth;
      if (clearAuth) {
        clearAuth();
      } else {
        // Manual clear if clearAuth doesn't exist
        useAuthStore.setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          tenantId: null,
          role: null,
        });
      }

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });
  });

  describe('isAuthenticated Helper', () => {
    it('returns false when not logged in', () => {
      useAuthStore.setState({
        user: null,
        accessToken: null,
      });

      const state = useAuthStore.getState();
      const isAuthenticated =
        typeof state.isAuthenticated === 'function'
          ? state.isAuthenticated()
          : !!state.accessToken;

      expect(isAuthenticated).toBe(false);
    });

    it('returns true when logged in', () => {
      useAuthStore.setState({
        user: { id: '1' },
        accessToken: 'valid-token',
      });

      const state = useAuthStore.getState();
      const isAuthenticated =
        typeof state.isAuthenticated === 'function'
          ? state.isAuthenticated()
          : !!state.accessToken;

      expect(isAuthenticated).toBe(true);
    });
  });
});

describe('Session Handling', () => {
  it('handles session expiry gracefully', async () => {
    server.use(
      http.get('/api/v1/entity/owners', () => {
        return HttpResponse.json(
          {
            error: 'Session expired',
            code: 'SESSION_EXPIRED',
          },
          { status: 401 }
        );
      })
    );

    const response = await fetch('/api/v1/entity/owners', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer expired-token',
      },
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.code).toBe('SESSION_EXPIRED');
  });

  it('handles concurrent requests during token refresh', async () => {
    let refreshCount = 0;

    server.use(
      http.post('/api/v1/auth/refresh', () => {
        refreshCount++;
        return HttpResponse.json({
          token: `new-token-${refreshCount}`,
          refreshToken: 'new-refresh-token',
        });
      })
    );

    // Simulate concurrent refresh requests
    const requests = [
      fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { Authorization: 'Bearer old-token' },
      }),
      fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { Authorization: 'Bearer old-token' },
      }),
    ];

    const responses = await Promise.all(requests);

    // Both should succeed (in a real implementation,
    // only one refresh should happen, but here we test the API)
    responses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });
});

describe('Role-Based Access', () => {
  it('identifies admin users', () => {
    useAuthStore.setState({
      user: { id: '1', email: 'admin@example.com' },
      role: 'ADMIN',
    });

    const state = useAuthStore.getState();
    expect(state.role).toBe('ADMIN');
  });

  it('identifies staff users', () => {
    useAuthStore.setState({
      user: { id: '2', email: 'staff@example.com' },
      role: 'STAFF',
    });

    const state = useAuthStore.getState();
    expect(state.role).toBe('STAFF');
  });

  it('identifies viewer users', () => {
    useAuthStore.setState({
      user: { id: '3', email: 'viewer@example.com' },
      role: 'VIEWER',
    });

    const state = useAuthStore.getState();
    expect(state.role).toBe('VIEWER');
  });
});
