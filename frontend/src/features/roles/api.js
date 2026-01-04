import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/stores/auth';
import toast from 'react-hot-toast';

/**
 * Get tenant key for query caching
 */
const useTenantKey = () => {
  const tenantId = useAuthStore((s) => s.tenantId);
  return tenantId || 'default';
};

// ============================================================================
// RBAC ROLES API HOOKS
// ============================================================================

/**
 * Fetch all roles (RBAC system)
 */
export const useRoles = (options = {}) => {
  const tenantKey = useTenantKey();
  const { includeInactive = false } = options;

  return useQuery({
    queryKey: ['roles', tenantKey, { includeInactive }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (includeInactive) params.append('includeInactive', 'true');
      const { data } = await apiClient.get(`/api/v1/roles?${params.toString()}`);
      return data;
    },
  });
};

/**
 * Fetch a single role by ID
 * NOTE: Backend endpoint GET /api/v1/roles/:roleId needs to be created
 */
export const useRole = (roleId, options = {}) => {
  const tenantKey = useTenantKey();
  const { skip = false } = options;

  return useQuery({
    queryKey: ['role', tenantKey, roleId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/v1/roles/${roleId}`);
      return data;
    },
    enabled: !skip && !!roleId,
  });
};

/**
 * Create a new role
 */
export const useCreateRole = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleData) => {
      const { data } = await apiClient.post('/api/v1/roles', roleData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantKey] });
      toast.success('Role created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create role');
    },
  });
};

/**
 * Update an existing role
 */
export const useUpdateRole = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data } = await apiClient.put(`/api/v1/roles/${id}`, updates);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['role', tenantKey, variables.id] });
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update role');
    },
  });
};

/**
 * Update role permissions
 * NOTE: Backend endpoint PUT /api/v1/roles/:roleId/permissions needs to be created
 */
export const useUpdateRolePermissions = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ roleId, permissions }) => {
      const { data } = await apiClient.put(`/api/v1/roles/${roleId}/permissions`, { permissions });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['role', tenantKey, variables.roleId] });
      toast.success('Permissions updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    },
  });
};

/**
 * Delete a role
 */
export const useDeleteRole = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId) => {
      await apiClient.delete(`/api/v1/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantKey] });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    },
  });
};

/**
 * Clone a role
 * NOTE: Backend endpoint POST /api/v1/roles/:roleId/clone needs to be created
 */
export const useCloneRole = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }) => {
      const { data } = await apiClient.post(`/api/v1/roles/${id}/clone`, { name });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantKey] });
      toast.success('Role cloned successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to clone role');
    },
  });
};

/**
 * Initialize system roles
 * NOTE: Backend endpoint POST /api/v1/roles/initialize needs to be created
 */
export const useInitializeSystemRoles = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/api/v1/roles/initialize');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantKey] });
      toast.success('System roles initialized');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to initialize system roles');
    },
  });
};

// ============================================================================
// STAFF ROLES (from TenantSettings)
// ============================================================================

/**
 * Fetch staff roles from TenantSettings
 */
export const useStaffRoles = () => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['staffRoles', tenantKey],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/config/staff-roles');
      return data?.staffRoles || ['Manager', 'Kennel Tech', 'Groomer', 'Trainer'];
    },
  });
};

/**
 * Add a new staff role to TenantSettings
 */
export const useAddStaffRole = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newRole) => {
      // Get current roles from cache
      const currentRoles = queryClient.getQueryData(['staffRoles', tenantKey]) || [];

      // Check if role already exists (case-insensitive)
      const exists = currentRoles.some(
        r => r.toLowerCase() === newRole.toLowerCase()
      );
      if (exists) {
        throw new Error(`Role "${newRole}" already exists`);
      }

      // Add new role and update via API
      const updatedRoles = [...currentRoles, newRole];
      await apiClient.put('/api/v1/config/staff-roles', { staffRoles: updatedRoles });

      // Return the new option for immediate selection
      return { value: newRole, label: newRole };
    },
    onSuccess: (_, newRole) => {
      // Update the cache with the new role
      queryClient.setQueryData(['staffRoles', tenantKey], (oldRoles = []) => {
        if (oldRoles.includes(newRole)) return oldRoles;
        return [...oldRoles, newRole];
      });
    },
    onError: (error) => {
      console.error('[staffRoles] Add failed:', error?.message);
    },
  });
};
