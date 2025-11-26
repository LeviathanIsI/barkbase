import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { listQueryDefaults, detailQueryDefaults, searchQueryDefaults } from '@/lib/queryConfig';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useOwnersQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.owners(tenantKey, params),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.owners.list, { params });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data ?? []);
      } catch (e) {
        console.warn('[owners] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
    placeholderData: (previousData) => previousData,
  });
};

export const useOwnerDetailsQuery = (ownerId, options = {}) => {
  const tenantKey = useTenantKey();
  const { enabled = Boolean(ownerId), ...queryOptions } = options;
  
  return useQuery({
    queryKey: [...queryKeys.owners(tenantKey), ownerId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.owners.detail(ownerId));
        return res?.data ?? null;
      } catch (e) {
        console.warn('[owner] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled,
    ...detailQueryDefaults,
    placeholderData: (previousData) => previousData,
    ...queryOptions,
  });
};

export const useOwnerQuery = (ownerId, options = {}) => useOwnerDetailsQuery(ownerId, options);

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
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
};

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
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
    },
  });
};

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
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
};

// Search owners for quick lookups
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
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
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

// Add pet to owner
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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantKey) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
    },
  });
};

// Remove pet from owner
export const useRemovePetFromOwnerMutation = (ownerId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (petId) => {
      await apiClient.delete(`${canonicalEndpoints.owners.pets(ownerId)}/${petId}`);
      return petId;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantKey) });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
    },
  });
};

// Aliases for convenience
export const useOwner = useOwnerQuery;
export const useOwners = useOwnersQuery;
