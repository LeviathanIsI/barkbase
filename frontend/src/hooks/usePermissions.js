/**
 * usePermissions Hook
 * Provides permission checking within React components
 */
import { useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { userHasPermission, getUserPermissions, PERMISSIONS } from '@/lib/permissions';

/**
 * Hook for checking user permissions
 * @returns {object} Permission checking utilities
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuthStore();

  // Get all permissions for current user
  const permissions = useMemo(() => {
    if (!user) return [];
    return getUserPermissions(user);
  }, [user]);

  // Check if user has a specific permission
  const can = useCallback(
    (permission) => {
      if (!isAuthenticated || !user) return false;
      return userHasPermission(user, permission);
    },
    [user, isAuthenticated]
  );

  // Check if user has any of the specified permissions
  const canAny = useCallback(
    (requiredPermissions) => {
      if (!isAuthenticated || !user) return false;
      return userHasPermission(user, requiredPermissions, 'any');
    },
    [user, isAuthenticated]
  );

  // Check if user has all of the specified permissions
  const canAll = useCallback(
    (requiredPermissions) => {
      if (!isAuthenticated || !user) return false;
      return userHasPermission(user, requiredPermissions, 'all');
    },
    [user, isAuthenticated]
  );

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const roles = user.roles || (user.role ? [user.role] : []);
    return roles.some(r => ['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(r?.toUpperCase()));
  }, [user]);

  // Check if user is manager or above
  const isManager = useMemo(() => {
    if (!user) return false;
    const roles = user.roles || (user.role ? [user.role] : []);
    return roles.some(r => ['SUPER_ADMIN', 'OWNER', 'ADMIN', 'MANAGER'].includes(r?.toUpperCase()));
  }, [user]);

  return {
    permissions,
    can,
    canAny,
    canAll,
    isAdmin,
    isManager,
    // Re-export permission constants for convenience
    PERMISSIONS,
  };
}

/**
 * Hook for permission-based visibility
 * Returns a function that wraps content to show/hide based on permission
 * @example
 * const { RequirePermission } = usePermissionGate();
 * return <RequirePermission permission="bookings:delete">Delete</RequirePermission>
 */
export function usePermissionGate() {
  const { can, canAny } = usePermissions();

  const RequirePermission = useCallback(
    ({ permission, permissions, mode = 'any', children, fallback = null }) => {
      if (permission && !can(permission)) return fallback;
      if (permissions) {
        const hasPermission = mode === 'all' ? 
          permissions.every(p => can(p)) : 
          permissions.some(p => can(p));
        if (!hasPermission) return fallback;
      }
      return children;
    },
    [can]
  );

  return { RequirePermission };
}

export default usePermissions;
