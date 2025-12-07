/**
 * usePermissions Hook Tests
 * Tests for permission checking hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions, usePermissionGate } from '../usePermissions';
import { useAuthStore } from '@/stores/auth';
import { PERMISSIONS } from '@/lib/permissions';

// Mock the auth store
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(),
}));

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });
    });

    it('should return empty permissions array', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions).toEqual([]);
    });

    it('should return false for can()', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.can(PERMISSIONS.BOOKINGS_VIEW)).toBe(false);
    });

    it('should return false for canAny()', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAny([PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.PETS_VIEW])).toBe(false);
    });

    it('should return false for canAll()', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.canAll([PERMISSIONS.BOOKINGS_VIEW])).toBe(false);
    });

    it('should return false for isAdmin', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(false);
    });

    it('should return false for isManager', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(false);
    });
  });

  describe('when user is a STAFF member', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: { id: '123', roles: ['STAFF'] },
        isAuthenticated: true,
      });
    });

    it('should have staff-level permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.permissions.length).toBeGreaterThan(0);
    });

    it('should return true for staff permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.can(PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
    });

    it('should return false for admin permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.can(PERMISSIONS.ADMIN_FULL_ACCESS)).toBe(false);
    });

    it('should return false for isAdmin', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(false);
    });

    it('should return false for isManager', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(false);
    });
  });

  describe('when user is a MANAGER', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: { id: '123', roles: ['MANAGER'] },
        isAuthenticated: true,
      });
    });

    it('should return true for manager permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.can(PERMISSIONS.STAFF_CREATE)).toBe(true);
    });

    it('should return false for isAdmin', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(false);
    });

    it('should return true for isManager', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(true);
    });
  });

  describe('when user is an OWNER', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: { id: '123', roles: ['OWNER'] },
        isAuthenticated: true,
      });
    });

    it('should return true for admin permissions via ADMIN_FULL_ACCESS', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.can(PERMISSIONS.BOOKINGS_DELETE)).toBe(true);
    });

    it('should return true for isAdmin', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
    });

    it('should return true for isManager', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(true);
    });
  });

  describe('when user is a SUPER_ADMIN', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: { id: '123', roles: ['SUPER_ADMIN'] },
        isAuthenticated: true,
      });
    });

    it('should return true for any permission', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.can(PERMISSIONS.BOOKINGS_VIEW)).toBe(true);
      expect(result.current.can(PERMISSIONS.ADMIN_FULL_ACCESS)).toBe(true);
      expect(result.current.can('any:random:permission')).toBe(true);
    });

    it('should return true for isAdmin', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isAdmin).toBe(true);
    });

    it('should return true for isManager', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(true);
    });
  });

  describe('canAny', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: { id: '123', roles: ['STAFF'] },
        isAuthenticated: true,
      });
    });

    it('should return true if user has any of the permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.canAny([PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.ADMIN_FULL_ACCESS])
      ).toBe(true);
    });

    it('should return false if user has none of the permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.canAny([PERMISSIONS.BOOKINGS_DELETE, PERMISSIONS.ADMIN_FULL_ACCESS])
      ).toBe(false);
    });
  });

  describe('canAll', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: { id: '123', roles: ['MANAGER'] },
        isAuthenticated: true,
      });
    });

    it('should return true if user has all permissions', () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.canAll([PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.BOOKINGS_CREATE])
      ).toBe(true);
    });

    it('should return false if user is missing any permission', () => {
      const { result } = renderHook(() => usePermissions());
      expect(
        result.current.canAll([PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.ADMIN_FULL_ACCESS])
      ).toBe(false);
    });
  });

  describe('user with single role (legacy format)', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: { id: '123', role: 'MANAGER' },
        isAuthenticated: true,
      });
    });

    it('should handle user with single role property', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.isManager).toBe(true);
    });
  });

  describe('PERMISSIONS export', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });
    });

    it('should export PERMISSIONS for convenience', () => {
      const { result } = renderHook(() => usePermissions());
      expect(result.current.PERMISSIONS).toBeDefined();
      expect(result.current.PERMISSIONS.BOOKINGS_VIEW).toBe('bookings:view');
    });
  });
});

describe('usePermissionGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RequirePermission component', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: { id: '123', roles: ['STAFF'] },
        isAuthenticated: true,
      });
    });

    it('should return children when user has permission', () => {
      const { result } = renderHook(() => usePermissionGate());
      const { RequirePermission } = result.current;

      const output = RequirePermission({
        permission: PERMISSIONS.BOOKINGS_VIEW,
        children: 'Allowed Content',
      });

      expect(output).toBe('Allowed Content');
    });

    it('should return fallback when user lacks permission', () => {
      const { result } = renderHook(() => usePermissionGate());
      const { RequirePermission } = result.current;

      const output = RequirePermission({
        permission: PERMISSIONS.ADMIN_FULL_ACCESS,
        children: 'Admin Content',
        fallback: 'No Access',
      });

      expect(output).toBe('No Access');
    });

    it('should return null as default fallback', () => {
      const { result } = renderHook(() => usePermissionGate());
      const { RequirePermission } = result.current;

      const output = RequirePermission({
        permission: PERMISSIONS.ADMIN_FULL_ACCESS,
        children: 'Admin Content',
      });

      expect(output).toBeNull();
    });

    it('should handle multiple permissions with mode=any', () => {
      const { result } = renderHook(() => usePermissionGate());
      const { RequirePermission } = result.current;

      const output = RequirePermission({
        permissions: [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.ADMIN_FULL_ACCESS],
        mode: 'any',
        children: 'Content',
      });

      expect(output).toBe('Content');
    });

    it('should handle multiple permissions with mode=all', () => {
      const { result } = renderHook(() => usePermissionGate());
      const { RequirePermission } = result.current;

      const output = RequirePermission({
        permissions: [PERMISSIONS.BOOKINGS_VIEW, PERMISSIONS.ADMIN_FULL_ACCESS],
        mode: 'all',
        children: 'Content',
        fallback: 'Blocked',
      });

      expect(output).toBe('Blocked');
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      useAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });
    });

    it('should return fallback for any permission check', () => {
      const { result } = renderHook(() => usePermissionGate());
      const { RequirePermission } = result.current;

      const output = RequirePermission({
        permission: PERMISSIONS.BOOKINGS_VIEW,
        children: 'Content',
        fallback: 'Login Required',
      });

      expect(output).toBe('Login Required');
    });
  });
});
