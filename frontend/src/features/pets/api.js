/**
 * Pets API Hooks
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
import { listQueryDefaults, detailQueryDefaults } from '@/lib/queryConfig';

// ============================================================================
// TENANT HELPERS
// ============================================================================

const useTenantId = () => useTenantStore((state) => state.tenant?.recordId ?? 'unknown');

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
// PETS-SPECIFIC NORMALIZERS (for backwards compatibility)
// ============================================================================

/**
 * Normalize pets response to consistent shape
 * Handles: array, { items: [] }, { pets: [] }, { data: [] }
 */
const normalizePetsResponse = (data) => {
  const normalized = normalizeListResponse(data, 'pets');
  // Map to legacy shape for backwards compatibility
  return {
    pets: normalized.items,
    total: normalized.total,
    raw: normalized.raw,
  };
};

/**
 * Ensure pets cache has correct shape
 */
const shapePetsCache = (data) => {
  if (!data) {
    return { pets: [], total: 0, raw: null };
  }
  if (Array.isArray(data)) {
    return { pets: data, total: data.length, raw: null };
  }
  if (Array.isArray(data.pets)) {
    return {
      pets: data.pets,
      total: data.total ?? data.pets.length,
      raw: data.raw ?? data,
    };
  }
  // Handle new factory format
  if (Array.isArray(data.items)) {
    return {
      pets: data.items,
      total: data.total ?? data.items.length,
      raw: data.raw ?? data,
    };
  }
  return { pets: [], total: data.total ?? 0, raw: data.raw ?? data };
};

// ============================================================================
// LIST QUERY - Using factory
// ============================================================================

/**
 * Fetch all pets for the current tenant
 * Returns: { pets: Pet[], total: number, raw: any }
 * @param {Object} params - Query parameters (e.g., { ownerId: 'uuid' })
 */
export const usePetsQuery = (params = {}) => {
  const tenantId = useTenantId();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.pets(tenantId), params],
    enabled: isTenantReady,
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.pets.list, { params });
        return normalizePetsResponse(res?.data);
      } catch (e) {
        console.warn('[pets] Falling back to empty list due to API error:', e?.message || e);
        return { pets: [], total: 0, raw: null };
      }
    },
    ...listQueryDefaults,
  });
};

// ============================================================================
// DETAIL QUERY - Using factory pattern
// ============================================================================

/**
 * Fetch a single pet by ID
 */
export const usePetDetailsQuery = (petId, options = {}) => {
  const tenantId = useTenantId();
  const { enabled = Boolean(petId), ...queryOptions } = options;

  return useQuery({
    queryKey: ['pets', { tenantId }, petId],
    queryFn: async () => {
      try {
        // Try multiple parameter names for including related records
        const res = await apiClient.get(canonicalEndpoints.pets.detail(petId), {
          params: { include: 'owners', expand: 'owners', with: 'owners' }
        });
        return res?.data ?? null;
      } catch (e) {
        console.warn('[pet] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled,
    ...detailQueryDefaults,
    ...queryOptions,
  });
};

// Alias for convenience
export const usePetQuery = (petId, options = {}) => usePetDetailsQuery(petId, options);

// ============================================================================
// VACCINATIONS QUERY
// ============================================================================

export const usePetVaccinationsQuery = (petId, options = {}) => {
  const enabled = Boolean(petId) && (options.enabled ?? true);
  const tenantId = useTenantId();
  
  return useQuery({
    queryKey: ['petVaccinations', { tenantId, petId }],
    enabled,
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.pets.vaccinations(petId));
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        return list;
      } catch (error) {
        console.error('Error fetching vaccinations:', error);
        return [];
      }
    },
    ...detailQueryDefaults,
    ...options,
  });
};

// ============================================================================
// PET OWNERS QUERY
// ============================================================================

/**
 * Fetch all owners for a specific pet via PetOwner junction table
 * Returns owner records with relationship metadata (isPrimary, relationship type)
 */
export const usePetOwnersQuery = (petId, options = {}) => {
  const tenantId = useTenantId();
  const isTenantReady = useTenantReady();
  const { enabled = Boolean(petId), ...queryOptions } = options;

  return useQuery({
    queryKey: ['pets', { tenantId }, petId, 'owners'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.pets.owners(petId));
        // Handle various response shapes
        const owners = res?.data?.data || res?.data?.owners || res?.data?.items || res?.data || [];
        return Array.isArray(owners) ? owners : [];
      } catch (e) {
        console.warn('[pet-owners] Error fetching owners for pet:', e?.message || e);
        return [];
      }
    },
    enabled: isTenantReady && enabled,
    ...detailQueryDefaults,
    ...queryOptions,
  });
};

// ============================================================================
// MUTATIONS - Using factory pattern for invalidation
// ============================================================================

/**
 * Create a new pet
 */
export const useCreatePetMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const listKey = queryKeys.pets(tenantId);
  
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(canonicalEndpoints.pets.list, payload);
      return res.data;
    },
    onSuccess: (created) => {
      if (created?.recordId) {
        queryClient.setQueryData(listKey, (oldValue) => {
          const current = shapePetsCache(oldValue);
          return {
            ...current,
            pets: [created, ...(current.pets ?? [])],
            total: (current.total ?? current.pets.length ?? 0) + 1,
          };
        });
      }
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
 * Update an existing pet
 */
export const useUpdatePetMutation = (petId) => {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const listKey = queryKeys.pets(tenantId);
  
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(canonicalEndpoints.pets.detail(petId), payload);
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (oldValue) => {
          const current = shapePetsCache(oldValue);
          return {
            ...current,
            pets: current.pets.map((pet) =>
              pet.recordId === petId ? { ...pet, ...payload } : pet
            ),
          };
        });
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
      queryClient.invalidateQueries({ queryKey: ['pets', { tenantId }, petId] });
    },
  });
};

/**
 * Update pet status (inline mutation without pre-specifying petId)
 * Takes { petId, ...payload } as the mutation argument
 */
export const useUpdatePetStatusMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const listKey = queryKeys.pets(tenantId);

  return useMutation({
    mutationFn: async ({ petId, ...payload }) => {
      const res = await apiClient.put(canonicalEndpoints.pets.detail(petId), payload);
      return res.data;
    },
    onMutate: async ({ petId, ...payload }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (oldValue) => {
          const current = shapePetsCache(oldValue);
          return {
            ...current,
            pets: current.pets.map((pet) =>
              (pet.recordId === petId || pet.id === petId)
                ? { ...pet, ...payload }
                : pet
            ),
          };
        });
      }
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
      toast.error(extractErrorMessage(error));
    },
    onSettled: (_, __, { petId }) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ['pets', { tenantId }, petId] });
    },
  });
};

/**
 * Delete a pet
 */
export const useDeletePetMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const listKey = queryKeys.pets(tenantId);
  
  return useMutation({
    mutationFn: async (petId) => {
      await apiClient.delete(canonicalEndpoints.pets.detail(petId));
      return petId;
    },
    onMutate: async (petId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (oldValue) => {
          const current = shapePetsCache(oldValue);
          return {
            ...current,
            pets: current.pets.filter((pet) => pet.recordId !== petId),
            total: Math.max((current.total ?? current.pets.length) - 1, 0),
          };
        });
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
    },
  });
};

// ============================================================================
// VACCINATION MUTATIONS
// ============================================================================

export const useCreateVaccinationMutation = (petId) => {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const vaccinationsKey = ['petVaccinations', { tenantId, petId }];
  
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(canonicalEndpoints.pets.vaccinations(petId), payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaccinationsKey });
    },
  });
};

export const useUpdateVaccinationMutation = (petId) => {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const vaccinationsKey = ['petVaccinations', { tenantId, petId }];
  
  return useMutation({
    mutationFn: async ({ vaccinationId, payload }) => {
      const res = await apiClient.put(`${canonicalEndpoints.pets.vaccinations(petId)}/${vaccinationId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaccinationsKey });
    },
  });
};

export const useDeleteVaccinationMutation = (petId) => {
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const vaccinationsKey = ['petVaccinations', { tenantId, petId }];

  return useMutation({
    mutationFn: async (vaccinationId) => {
      const res = await apiClient.delete(`${canonicalEndpoints.pets.vaccinations(petId)}/${vaccinationId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vaccinationsKey });
      queryClient.invalidateQueries({ queryKey: ['vaccinations', 'expiring'] });
    },
  });
};

// ============================================================================
// DIRECT API FUNCTIONS (non-hook, for use in effects/callbacks)
// ============================================================================

/**
 * Fetch all pets - direct function for use outside of React components
 */
export const getPets = async (params = {}) => {
  const res = await apiClient.get(canonicalEndpoints.pets.list, { params });
  const data = res?.data;
  // Handle various response shapes from entity-service
  // Entity-service returns: { data: [...pets], pagination: {...} }
  const pets = Array.isArray(data) ? data : (data?.data || data?.pets || data?.items || []);
  return { data: pets };
};

/**
 * Fetch a single pet by ID
 */
export const getPet = async (petId) => {
  const res = await apiClient.get(canonicalEndpoints.pets.detail(petId));
  return res?.data;
};

/**
 * Create a new pet
 */
export const createPet = async (payload) => {
  const res = await apiClient.post(canonicalEndpoints.pets.list, payload);
  return res?.data;
};

/**
 * Update a pet
 */
export const updatePet = async (petId, payload) => {
  const res = await apiClient.put(canonicalEndpoints.pets.detail(petId), payload);
  return res?.data;
};

/**
 * Delete a pet
 */
export const deletePet = async (petId) => {
  await apiClient.delete(canonicalEndpoints.pets.detail(petId));
  return petId;
};
