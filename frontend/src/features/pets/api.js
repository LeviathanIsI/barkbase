import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const usePetsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  const search = params.search ? `?search=${encodeURIComponent(params.search)}` : '';
  return useQuery({
    queryKey: queryKeys.pets(tenantKey, params),
    queryFn: () => apiClient(`/api/v1/pets${search}`),
    staleTime: 30 * 1000,
  });
};

export const usePetDetailsQuery = (petId, options = {}) => {
  const tenantKey = useTenantKey();
  const { enabled = Boolean(petId), ...queryOptions } = options;
  return useQuery({
    queryKey: [...queryKeys.pets(tenantKey), petId],
    queryFn: () => apiClient(`/api/v1/pets/${petId}`),
    enabled,
    ...queryOptions,
  });
};

export const usePetQuery = (petId, options = {}) => usePetDetailsQuery(petId, options);

export const useUpdatePetMutation = (petId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.pets(tenantKey, {});
  return useMutation({
    mutationFn: (payload) => apiClient(`/api/v1/pets/${petId}`, { method: 'PUT', body: payload }),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (old = []) =>
          old.map((pet) =>
            pet.recordId === petId
              ? {
                  ...pet,
                  ...payload,
                }
              : pet,
          ),
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
    },
  });
};

export const useDeletePetMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.pets(tenantKey, {});
  return useMutation({
    mutationFn: (petId) => apiClient(`/api/v1/pets/${petId}`, { method: 'DELETE' }),
    onMutate: async (petId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (old = []) => old.filter((pet) => pet.recordId !== petId));
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

export const useCreatePetMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.pets(tenantKey, {});
  return useMutation({
    mutationFn: (payload) => apiClient('/api/v1/pets', { method: 'POST', body: payload }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
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
