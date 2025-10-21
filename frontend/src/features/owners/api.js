import { useQuery, useMutation } from '@tanstack/react-query';
import { from } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

export const useOwnersQuery = (params = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  return useQuery({
    queryKey: queryKeys.owners(tenantKey, params),
    queryFn: async () => {
      try {
        const { data, error } = await from('owners').select('*').get();
        if (error) throw new Error(error.message);
        // Normalize to array since some API clients return { data }
        return Array.isArray(data) ? data : (data?.data ?? data ?? []);
      } catch (e) {
        console.warn('[owners] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
  });
};

export const useOwnerQuery = (recordId, options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const { enabled = !!recordId, ...queryOptions } = options;

  return useQuery({
    queryKey: [...queryKeys.owners(tenantKey), recordId],
    queryFn: async () => {
      try {
        const { data, error } = await from('owners').select('*').eq('id', recordId).get();
        if (error) throw new Error(error.message);
        return Array.isArray(data) ? data[0] : (data?.data?.[0] ?? data ?? null);
      } catch (e) {
        console.warn('[owner] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled,
    ...queryOptions,
  });
};

export const useCreateOwnerMutation = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await from('owners').insert(payload);
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

export const useUpdateOwnerMutation = (recordId) => {
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await from('owners').update(payload).eq('id', recordId);
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

export const useDeleteOwnerMutation = () => {
  return useMutation({
    mutationFn: async (recordId) => {
      const { error } = await from('owners').delete().eq('id', recordId);
      if (error) throw new Error(error.message);
      return recordId;
    },
  });
};

export const useAddPetToOwnerMutation = () => {
  return useMutation({
    mutationFn: async ({ ownerId, petId, isPrimary = false }) => {
      const { data, error } = await from('petOwners').insert({ ownerId, petId, isPrimary });
      if (error) throw new Error(error.message);
      return data;
    },
  });
};

export const useRemovePetFromOwnerMutation = () => {
  return useMutation({
    mutationFn: async ({ ownerId, petId }) => {
      // Deleting from a join table requires filters, not a single ID
      const { error } = await from('petOwners').delete().eq('ownerId', ownerId).eq('petId', petId);
      if (error) throw new Error(error.message);
      return { ownerId, petId };
    },
  });
};
