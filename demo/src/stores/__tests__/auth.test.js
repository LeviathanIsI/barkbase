/**
 * Auth Store Tests
 * Tests for Zustand authentication store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useAuthStore.setState({
      user: null,
      session: null,
      memberships: [],
      role: null,
      tenantId: null,
      accessToken: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have null user by default', () => {
      const { user } = useAuthStore.getState();
      expect(user).toBeNull();
    });

    it('should have null role by default', () => {
      const { role } = useAuthStore.getState();
      expect(role).toBeNull();
    });

    it('should have null tenantId by default', () => {
      const { tenantId } = useAuthStore.getState();
      expect(tenantId).toBeNull();
    });

    it('should have empty memberships by default', () => {
      const { memberships } = useAuthStore.getState();
      expect(memberships).toEqual([]);
    });

    it('should have null accessToken by default', () => {
      const { accessToken } = useAuthStore.getState();
      expect(accessToken).toBeNull();
    });
  });

  describe('setAuth', () => {
    it('should set user data', () => {
      const user = { id: '123', email: 'test@example.com', name: 'Test User' };
      useAuthStore.getState().setAuth({ user });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
    });

    it('should set role and convert to uppercase', () => {
      useAuthStore.getState().setAuth({ role: 'admin' });

      const { role } = useAuthStore.getState();
      expect(role).toBe('ADMIN');
    });

    it('should extract role from user if not provided directly', () => {
      const user = { id: '123', role: 'manager' };
      useAuthStore.getState().setAuth({ user });

      const { role } = useAuthStore.getState();
      expect(role).toBe('MANAGER');
    });

    it('should set tenantId', () => {
      useAuthStore.getState().setAuth({ tenantId: 'tenant-123' });

      const { tenantId } = useAuthStore.getState();
      expect(tenantId).toBe('tenant-123');
    });

    it('should extract tenantId from user if not provided', () => {
      const user = { id: '123', tenantId: 'tenant-from-user' };
      useAuthStore.getState().setAuth({ user });

      const { tenantId } = useAuthStore.getState();
      expect(tenantId).toBe('tenant-from-user');
    });

    it('should set memberships', () => {
      const memberships = [{ tenantId: 't1', role: 'ADMIN' }];
      useAuthStore.getState().setAuth({ memberships });

      const state = useAuthStore.getState();
      expect(state.memberships).toEqual(memberships);
    });

    it('should extract memberships from user if not provided', () => {
      const user = { id: '123', memberships: [{ tenantId: 't1' }] };
      useAuthStore.getState().setAuth({ user });

      const { memberships } = useAuthStore.getState();
      expect(memberships).toEqual([{ tenantId: 't1' }]);
    });

    it('should set accessToken', () => {
      useAuthStore.getState().setAuth({ accessToken: 'test-token-123' });

      const { accessToken } = useAuthStore.getState();
      expect(accessToken).toBe('test-token-123');
    });

    it('should handle empty payload', () => {
      useAuthStore.getState().setAuth({});

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.role).toBeNull();
      expect(state.memberships).toEqual([]);
    });

    it('should handle undefined payload', () => {
      useAuthStore.getState().setAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('updateTokens', () => {
    it('should update role', () => {
      useAuthStore.getState().setAuth({ role: 'staff' });
      useAuthStore.getState().updateTokens({ role: 'manager' });

      const { role } = useAuthStore.getState();
      expect(role).toBe('MANAGER');
    });

    it('should update tenantId', () => {
      useAuthStore.getState().setAuth({ tenantId: 'old-tenant' });
      useAuthStore.getState().updateTokens({ tenantId: 'new-tenant' });

      const { tenantId } = useAuthStore.getState();
      expect(tenantId).toBe('new-tenant');
    });

    it('should update accessToken', () => {
      useAuthStore.getState().setAuth({ accessToken: 'old-token' });
      useAuthStore.getState().updateTokens({ accessToken: 'new-token' });

      const { accessToken } = useAuthStore.getState();
      expect(accessToken).toBe('new-token');
    });

    it('should preserve existing values when not provided', () => {
      useAuthStore.getState().setAuth({
        role: 'admin',
        tenantId: 'tenant-1',
        accessToken: 'token-1',
      });

      useAuthStore.getState().updateTokens({ role: 'manager' });

      const state = useAuthStore.getState();
      expect(state.role).toBe('MANAGER');
      expect(state.tenantId).toBe('tenant-1');
      expect(state.accessToken).toBe('token-1');
    });
  });

  describe('setSession', () => {
    it('should clear auth if session is null', () => {
      useAuthStore.getState().setAuth({ user: { id: '123' }, role: 'admin' });
      useAuthStore.getState().setSession(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.role).toBeNull();
    });

    it('should clear auth if session has no idToken', () => {
      useAuthStore.getState().setAuth({ user: { id: '123' } });
      useAuthStore.getState().setSession({});

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should set session with idToken', () => {
      const session = { idToken: 'test-id-token' };
      useAuthStore.getState().setSession(session);

      const state = useAuthStore.getState();
      expect(state.session).toEqual(session);
      expect(state.user).toBeDefined();
    });
  });

  describe('clearAuth', () => {
    it('should reset all state to initial values', () => {
      useAuthStore.getState().setAuth({
        user: { id: '123', email: 'test@test.com' },
        role: 'admin',
        tenantId: 'tenant-123',
        memberships: [{ id: 'm1' }],
        accessToken: 'token-123',
      });

      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.role).toBeNull();
      expect(state.tenantId).toBeNull();
      expect(state.memberships).toEqual([]);
      expect(state.accessToken).toBeNull();
    });
  });

  describe('logout', () => {
    it('should reset all state (same as clearAuth)', () => {
      useAuthStore.getState().setAuth({
        user: { id: '123' },
        role: 'admin',
      });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.role).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true if user has matching role', () => {
      useAuthStore.getState().setAuth({ role: 'ADMIN' });

      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(true);
    });

    it('should be case insensitive', () => {
      useAuthStore.getState().setAuth({ role: 'admin' });

      expect(useAuthStore.getState().hasRole('Admin')).toBe(true);
      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(true);
      expect(useAuthStore.getState().hasRole('admin')).toBe(true);
    });

    it('should return false if role does not match', () => {
      useAuthStore.getState().setAuth({ role: 'staff' });

      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(false);
    });

    it('should return false if no role is set', () => {
      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(false);
    });

    it('should check against array of roles', () => {
      useAuthStore.getState().setAuth({ role: 'manager' });

      expect(useAuthStore.getState().hasRole(['ADMIN', 'MANAGER'])).toBe(true);
      expect(useAuthStore.getState().hasRole(['ADMIN', 'STAFF'])).toBe(false);
    });

    it('should handle lowercase roles in array', () => {
      useAuthStore.getState().setAuth({ role: 'OWNER' });

      expect(useAuthStore.getState().hasRole(['admin', 'owner'])).toBe(true);
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when user is null', () => {
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('should return true when user is set', () => {
      useAuthStore.getState().setAuth({ user: { id: '123' } });

      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });

    it('should return true even with minimal user object', () => {
      useAuthStore.getState().setAuth({ user: {} });

      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });

    it('should return false after clearAuth', () => {
      useAuthStore.getState().setAuth({ user: { id: '123' } });
      useAuthStore.getState().clearAuth();

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('should return false after logout', () => {
      useAuthStore.getState().setAuth({ user: { id: '123' } });
      useAuthStore.getState().logout();

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });
  });
});
