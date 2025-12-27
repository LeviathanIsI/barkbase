/**
 * Staff API Hooks
 *
 * Tenant-aware hooks for staff management.
 * Uses canonical endpoints and follows consistent error handling patterns.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { listQueryDefaults } from '@/lib/queryConfig';

// ============================================================================
// TENANT HELPERS
// ============================================================================

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Check if tenant is ready for API calls
 * Queries should be disabled until tenantId is available
 */
const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

// ============================================================================
// NORMALIZERS
// ============================================================================

/**
 * Normalize staff list response to always return an array
 */
const normalizeStaffResponse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.staff)) return data.staff;
  return [];
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all staff members for the current tenant
 */
export const useStaffQuery = () => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.staff(tenantKey),
    enabled: isTenantReady,
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.staff.list);
        const staff = normalizeStaffResponse(res?.data);
        return staff;
      } catch (e) {
        console.warn('[staff] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
  });
};

/**
 * Fetch a single staff member by ID
 */
export const useStaffDetailQuery = (staffId, options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.staff(tenantKey), staffId],
    enabled: isTenantReady && Boolean(staffId) && (options.enabled !== false),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.staff.detail(staffId));
        return res?.data || null;
      } catch (e) {
        console.warn('[staff] Failed to fetch staff member:', e?.message || e);
        return null;
      }
    },
    ...options,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Update staff member status (active/inactive)
 */
export const useStaffStatusMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ staffId, isActive }) => {
      const res = await apiClient.put(canonicalEndpoints.staff.detail(staffId), { isActive });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(tenantKey) });
    },
  });
};

/**
 * Create a new staff member
 */
export const useCreateStaffMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (staffData) => {
      const res = await apiClient.post(canonicalEndpoints.staff.list, staffData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(tenantKey) });
    },
  });
};

/**
 * Update a staff member
 */
export const useUpdateStaffMutation = (staffId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (updates) => {
      const res = await apiClient.put(canonicalEndpoints.staff.detail(staffId), updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(tenantKey) });
    },
  });
};

/**
 * Delete a staff member
 */
export const useDeleteStaffMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (staffId) => {
      await apiClient.delete(canonicalEndpoints.staff.detail(staffId));
      return staffId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(tenantKey) });
    },
  });
};

// ============================================================================
// STAFF ROLES (from Role table)
// ============================================================================

/**
 * Fetch staff roles from Role table
 */
export const useStaffRolesQuery = () => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['roles', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/roles');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a new role in Role table
 */
export const useCreateRole = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleName) => {
      const res = await apiClient.post('/api/v1/roles', { name: roleName });
      const newRole = res.data?.data || res.data;
      return { value: newRole.record_id || newRole.id, label: newRole.name };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', tenantKey] });
    },
    onError: (error) => {
      console.error('[roles] Create failed:', error?.message);
    },
  });
};

// ============================================================================
// DEPARTMENTS
// ============================================================================

/**
 * Fetch departments from TenantSettings
 */
export const useDepartments = () => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['departments', tenantKey],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/config/departments');
        return res.data?.departments || [];
      } catch (e) {
        console.warn('[departments] Error:', e?.message);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    enabled: isTenantReady,
  });
};

/**
 * Add a new department to TenantSettings
 */
export const useAddDepartment = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newDepartment) => {
      const currentDepartments = queryClient.getQueryData(['departments', tenantKey]) || [];

      const exists = currentDepartments.some(
        d => d.toLowerCase() === newDepartment.toLowerCase()
      );
      if (exists) {
        throw new Error(`Department "${newDepartment}" already exists`);
      }

      const updatedDepartments = [...currentDepartments, newDepartment];
      await apiClient.put('/api/v1/config/departments', { departments: updatedDepartments });

      return { value: newDepartment, label: newDepartment };
    },
    onSuccess: (_, newDepartment) => {
      queryClient.setQueryData(['departments', tenantKey], (oldDepartments = []) => {
        if (oldDepartments.includes(newDepartment)) return oldDepartments;
        return [...oldDepartments, newDepartment];
      });
    },
    onError: (error) => {
      console.error('[departments] Add failed:', error?.message);
    },
  });
};
