import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

export const useOwnersQuery = (params = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  return useQuery({
    queryKey: queryKeys.owners(tenantKey, params),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/owners');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data ?? []);
      } catch (e) {
        console.warn('[owners] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
  });
};

// Backward-compatible alias expected by some consumers
export const useOwners = (params = {}) => {
  return useOwnersQuery(params);
};

export const useOwnerQuery = (recordId, options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const { enabled = !!recordId, ...queryOptions } = options;

  return useQuery({
    queryKey: [...queryKeys.owners(tenantKey), recordId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/api/v1/owners/${recordId}`);
        return res?.data ?? null;
      } catch (e) {
        console.warn('[owner] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled,
    ...queryOptions,
  });
};

// Backward-compatible alias expected by consumers
export const useOwner = (recordId, options = {}) => {
  return useOwnerQuery(recordId, options);
};

export const useCreateOwnerMutation = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/api/v1/owners', payload);
      return res.data;
    },
  });
};

export const useUpdateOwnerMutation = (recordId) => {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(`/api/v1/owners/${recordId}`, payload);
      return res.data;
    },
  });
};

export const useDeleteOwnerMutation = () => {
  return useMutation({
    mutationFn: async (recordId) => {
      await apiClient.delete(`/api/v1/owners/${recordId}`);
      return recordId;
    },
  });
};

export const useAddPetToOwnerMutation = () => {
  return useMutation({
    mutationFn: async ({ ownerId, petId, isPrimary = false }) => {
      const res = await apiClient.post('/api/v1/pets/owners', { ownerId, petId, isPrimary });
      return res.data ?? { ok: true };
    },
  });
};

export const useRemovePetFromOwnerMutation = () => {
  return useMutation({
    mutationFn: async ({ ownerId, petId }) => {
      // Set non-primary or remove link requires a dedicated endpoint; using upsert with isPrimary=false clears primary
      await apiClient.post('/api/v1/pets/owners', { ownerId, petId, isPrimary: false });
      return { ownerId, petId };
    },
  });
};
