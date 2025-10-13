import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

export const useOwnersQuery = (params = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

  return useQuery({
    queryKey: queryKeys.owners(tenantKey, params),
    queryFn: async () => {
      const queryString = new URLSearchParams(params).toString();
      const path = queryString ? `/api/v1/owners?${queryString}` : '/api/v1/owners';
      return await apiClient(path);
    },
  });
};

export const useOwnerQuery = (id, options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const { enabled = !!id, ...queryOptions } = options;

  return useQuery({
    queryKey: [...queryKeys.owners(tenantKey), id],
    queryFn: async () => {
      return await apiClient(`/api/v1/owners/${id}`);
    },
    enabled,
    ...queryOptions,
  });
};

export const useCreateOwnerMutation = () => {
  return useMutation({
    mutationFn: async (data) => {
      return await apiClient('/api/v1/owners', {
        method: 'POST',
        body: data,
      });
    },
  });
};

export const useUpdateOwnerMutation = (id) => {
  return useMutation({
    mutationFn: async (data) => {
      return await apiClient(`/api/v1/owners/${id}`, {
        method: 'PUT',
        body: data,
      });
    },
  });
};

export const useDeleteOwnerMutation = () => {
  return useMutation({
    mutationFn: async (id) => {
      return await apiClient(`/api/v1/owners/${id}`, {
        method: 'DELETE',
      });
    },
  });
};

export const useAddPetToOwnerMutation = (ownerId) => {
  return useMutation({
    mutationFn: async ({ petId, isPrimary = false }) => {
      return await apiClient(`/api/v1/owners/${ownerId}/pets`, {
        method: 'POST',
        body: { petId, isPrimary },
      });
    },
  });
};

export const useRemovePetFromOwnerMutation = (ownerId) => {
  return useMutation({
    mutationFn: async (petId) => {
      return await apiClient(`/api/v1/owners/${ownerId}/pets/${petId}`, {
        method: 'DELETE',
      });
    },
  });
};
