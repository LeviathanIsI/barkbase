import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import toast from 'react-hot-toast';

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

// Kennels are facilities/entities - using entity service
const KENNELS_BASE = '/api/v1/entity/facilities';

/**
 * Normalize kennels response to always return an array
 */
const normalizeKennelsResponse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.kennels)) return data.kennels;
  if (Array.isArray(data?.facilities)) return data.facilities;
  return [];
};

/**
 * Fetch all kennels/facilities for the current tenant
 *
 * Backend response shape (from entity-service):
 * { data: [{ id, tenant_id, name, type, capacity, is_active, notes, created_at, updated_at }] }
 *
 * Returns: array of kennel objects (always an array, even on error)
 */
export const useKennels = (filters = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['kennels', tenantKey, filters],
    queryFn: async () => {
      try {
        const res = await apiClient.get(KENNELS_BASE, { params: { ...filters, type: 'kennel' } });
        const kennels = normalizeKennelsResponse(res?.data);
        console.log('[kennels] list length', Array.isArray(kennels) ? kennels.length : 'NOT ARRAY', kennels);
        return kennels;
      } catch (e) {
        console.warn('[kennels] Error fetching, returning empty array:', e?.message);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: isTenantReady,
    placeholderData: (previousData) => previousData ?? [],
  });
};

/**
 * Fetch kennels with current occupancy data
 */
export const useKennelsWithOccupancy = () => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['kennels', tenantKey, 'occupancy'],
    queryFn: async () => {
      try {
        // Occupancy is in analytics service
        const res = await apiClient.get('/api/v1/analytics/occupancy/current');
        return res.data?.data || res.data || {};
      } catch (e) {
        console.warn('[kennels-occupancy] Error:', e?.message);
        return { currentOccupancy: 0, totalCapacity: 0, occupancyRate: 0 };
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute - occupancy changes frequently
    enabled: isTenantReady,
  });
};

/**
 * Fetch single kennel by ID
 */
export const useKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['kennels', tenantKey, kennelId],
    queryFn: async () => {
      const res = await apiClient.get(`${KENNELS_BASE}/${kennelId}`);
      return res.data;
    },
    enabled: isTenantReady && !!kennelId,
  });
};

/**
 * Create kennel mutation
 *
 * Backend: POST /api/v1/entity/facilities
 * Creates a new kennel/facility with real DB persistence
 */
export const useCreateKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(KENNELS_BASE, { ...payload, type: 'kennel' });
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      toast.success('Kennel created successfully');
    },
    onError: (error) => {
      console.error('[kennels] Create failed:', error?.message);
      toast.error(error?.response?.data?.message || 'Failed to create kennel');
    },
  });
};

/**
 * Update kennel mutation
 *
 * Backend: PUT /api/v1/entity/facilities/:id
 * Updates an existing kennel/facility with real DB persistence
 */
export const useUpdateKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(`${KENNELS_BASE}/${kennelId}`, payload);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey, kennelId] });
      toast.success('Kennel updated successfully');
    },
    onError: (error) => {
      console.error('[kennels] Update failed:', error?.message);
      toast.error(error?.response?.data?.message || 'Failed to update kennel');
    },
  });
};

/**
 * Delete kennel mutation
 */
export const useDeleteKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kennelId) => {
      await apiClient.delete(`${KENNELS_BASE}/${kennelId}`);
      return kennelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      toast.success('Kennel deleted');
    },
    onError: (error) => {
      console.error('[kennels] Delete failed:', error?.message);
      toast.error('Failed to delete kennel');
    },
  });
};

// TODO: Refactor to a dedicated Lambda for availability logic
// export const useCheckKennelAvailability = (kennelId) => { ... };
