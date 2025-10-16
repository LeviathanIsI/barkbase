import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';
import { apiClient } from '@/lib/apiClient';

/**
 * Hook to manage user permissions
 */
export const usePermissions = () => {
  const user = useAuthStore(state => state.user);
  const [permissions, setPermissions] = useState({});
  const [roles, setRoles] = useState([]);
  const [legacyRole, setLegacyRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Permission system is not yet active - tables need to be created first
    // Return empty permissions for now
    setPermissions({});
    setRoles([]);
    setLegacyRole(null);
    setLoading(false);
    
    // TODO: Uncomment this once permission tables are created in database
    // const fetchPermissions = async () => {
    //   if (!user) {
    //     setPermissions({});
    //     setRoles([]);
    //     setLegacyRole(null);
    //     setLoading(false);
    //     return;
    //   }
    //
    //   try {
    //     const response = await apiClient.get('/api/v1/user-permissions/me');
    //     setPermissions(response.permissions || {});
    //     setRoles(response.roles || []);
    //     setLegacyRole(response.legacyRole || null);
    //   } catch (error) {
    //     setPermissions({});
    //     setRoles([]);
    //     setLegacyRole(null);
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    //
    // fetchPermissions();
  }, [user]);

  const hasPermission = useCallback((permission) => {
    return permissions[permission] === true;
  }, [permissions]);

  const hasAnyPermission = useCallback((permissionList) => {
    return permissionList.some(p => permissions[p] === true);
  }, [permissions]);

  const hasAllPermissions = useCallback((permissionList) => {
    return permissionList.every(p => permissions[p] === true);
  }, [permissions]);

  const hasRole = useCallback((roleName) => {
    return roles.some(role => role.name === roleName);
  }, [roles]);

  const isOwner = useCallback(() => {
    return legacyRole === 'OWNER' || hasRole('Owner');
  }, [legacyRole, hasRole]);

  const isAdmin = useCallback(() => {
    return legacyRole === 'ADMIN' || hasRole('Administrator') || isOwner();
  }, [legacyRole, hasRole, isOwner]);

  const canManage = useCallback(() => {
    return isAdmin() || hasPermission('MANAGE_SETTINGS');
  }, [isAdmin, hasPermission]);

  return {
    permissions,
    roles,
    legacyRole,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isOwner,
    isAdmin,
    canManage
  };
};

/**
 * Hook to check a single permission
 */
export const usePermission = (permission) => {
  const { hasPermission, loading } = usePermissions();
  return {
    allowed: hasPermission(permission),
    loading
  };
};

/**
 * Hook to check if user has any of the specified permissions
 */
export const useAnyPermission = (permissions) => {
  const { hasAnyPermission, loading } = usePermissions();
  return {
    allowed: hasAnyPermission(permissions),
    loading
  };
};

/**
 * Hook to check if user has all of the specified permissions
 */
export const useAllPermissions = (permissions) => {
  const { hasAllPermissions, loading } = usePermissions();
  return {
    allowed: hasAllPermissions(permissions),
    loading
  };
};
