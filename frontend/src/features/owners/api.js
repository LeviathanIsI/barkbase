/**
 * Owners API Hooks
 * 
 * Uses the shared API hook factory for standardized query/mutation patterns.
 * All hooks are tenant-aware and follow consistent error handling.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { normalizeListResponse, extractErrorMessage } from '@/lib/createApiHooks';
import { listQueryDefaults, detailQueryDefaults, searchQueryDefaults } from '@/lib/queryConfig';

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
// LIST QUERY
// ============================================================================

/**
 * Fetch all owners for the current tenant
 * Returns normalized array of owners
 */
export const useOwnersQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.owners(tenantKey, params),
    enabled: isTenantReady,
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.owners.list, { params });
        // Normalize using factory helper, return just items for backwards compat
        const normalized = normalizeListResponse(res?.data, 'owners');
        return normalized.items;
      } catch (e) {
        console.warn('[owners] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
  });
};

// ============================================================================
// DETAIL QUERY
// ============================================================================

/**
 * Fetch a single owner by ID
 */
export const useOwnerDetailsQuery = (ownerId, options = {}) => {
  const tenantKey = useTenantKey();
  const { enabled = Boolean(ownerId), ...queryOptions } = options;

  return useQuery({
    queryKey: [...queryKeys.owners(tenantKey), ownerId],
    queryFn: async () => {
      try {
        // Try multiple parameter names for including related records
        const res = await apiClient.get(canonicalEndpoints.owners.detail(ownerId), {
          params: { include: 'pets', expand: 'pets', with: 'pets' }
        });
        return res?.data ?? null;
      } catch (e) {
        console.warn('[owner] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled,
    ...detailQueryDefaults,
    ...queryOptions,
  });
};

// Alias for convenience
export const useOwnerQuery = (ownerId, options = {}) => useOwnerDetailsQuery(ownerId, options);

// ============================================================================
// SEARCH QUERY
// ============================================================================

/**
 * Search owners for quick lookups (debounce-friendly)
 */
export const useOwnerSearchQuery = (searchTerm, options = {}) => {
  const tenantKey = useTenantKey();
  const { enabled = searchTerm?.length >= 2, ...queryOptions } = options;
  
  return useQuery({
    queryKey: [...queryKeys.owners(tenantKey), 'search', searchTerm],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.owners.list, { 
          params: { search: searchTerm, limit: 10 } 
        });
        const normalized = normalizeListResponse(res?.data, 'owners');
        return normalized.items;
      } catch (e) {
        console.warn('[owner-search] Error:', e?.message || e);
        return [];
      }
    },
    enabled,
    ...searchQueryDefaults,
    ...queryOptions,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new owner
 */
export const useCreateOwnerMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.owners(tenantKey, {});
  
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(canonicalEndpoints.owners.list, payload);
      return res.data;
    },
    onSuccess: (created) => {
      if (created?.recordId) {
        queryClient.setQueryData(listKey, (old = []) => [created, ...old]);
      }
      toast.success('Owner created successfully');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
};

/**
 * Update an existing owner
 */
export const useUpdateOwnerMutation = (ownerId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.owners(tenantKey, {});

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(canonicalEndpoints.owners.detail(ownerId), payload);
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (old = []) =>
          old.map((owner) =>
            owner.recordId === ownerId
              ? { ...owner, ...payload }
              : owner
          )
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error(extractErrorMessage(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
    },
  });
};

/**
 * Update owner status (inline mutation without pre-specifying ownerId)
 * Takes { ownerId, ...payload } as the mutation argument
 */
export const useUpdateOwnerStatusMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.owners(tenantKey, {});

  return useMutation({
    mutationFn: async ({ ownerId, ...payload }) => {
      const res = await apiClient.put(canonicalEndpoints.owners.detail(ownerId), payload);
      return res.data;
    },
    onMutate: async ({ ownerId, ...payload }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (old = []) =>
          old.map((owner) =>
            (owner.recordId === ownerId || owner.id === ownerId)
              ? { ...owner, ...payload }
              : owner
          )
        );
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error(extractErrorMessage(error));
    },
    onSettled: (_, __, { ownerId }) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
    },
  });
};

/**
 * Delete an owner
 */
export const useDeleteOwnerMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.owners(tenantKey, {});
  
  return useMutation({
    mutationFn: async (ownerId) => {
      await apiClient.delete(canonicalEndpoints.owners.detail(ownerId));
      return ownerId;
    },
    onMutate: async (ownerId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (old = []) => old.filter((owner) => owner.recordId !== ownerId));
      }
      return { previous };
    },
    onSuccess: () => {
      toast.success('Owner deleted successfully');
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error(extractErrorMessage(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
};

// ============================================================================
// PET RELATIONSHIP QUERIES
// ============================================================================

/**
 * Fetch pets for a specific owner via the junction table
 * Uses /api/v1/entity/owners/{id}/pets endpoint
 */
export const useOwnerPetsQuery = (ownerId, options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();
  const { enabled = Boolean(ownerId), ...queryOptions } = options;

  return useQuery({
    queryKey: [...queryKeys.owners(tenantKey), ownerId, 'pets'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.owners.pets(ownerId));
        // Handle various response shapes
        const pets = res?.data?.data || res?.data?.pets || res?.data?.items || res?.data || [];
        return Array.isArray(pets) ? pets : [];
      } catch (e) {
        console.warn('[owner-pets] Error fetching pets for owner:', e?.message || e);
        return [];
      }
    },
    enabled: isTenantReady && enabled,
    ...detailQueryDefaults,
    ...queryOptions,
  });
};

// ============================================================================
// PET RELATIONSHIP MUTATIONS
// ============================================================================

/**
 * Add pet to owner
 */
export const useAddPetToOwnerMutation = (ownerId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async ({ petId, isPrimary = false }) => {
      const res = await apiClient.post(canonicalEndpoints.owners.pets(ownerId), {
        petId,
        isPrimary
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Pet linked to owner');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantKey) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
    },
  });
};

/**
 * Remove pet from owner
 */
export const useRemovePetFromOwnerMutation = (ownerId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (petId) => {
      await apiClient.delete(`${canonicalEndpoints.owners.pets(ownerId)}/${petId}`);
      return petId;
    },
    onSuccess: () => {
      toast.success('Pet removed from owner');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantKey) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
    },
  });
};

// ============================================================================
// CONVENIENCE ALIASES
// ============================================================================

export const useOwner = useOwnerQuery;
export const useOwners = useOwnersQuery;
