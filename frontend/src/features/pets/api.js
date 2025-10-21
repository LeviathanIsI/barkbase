import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { from } from '@/lib/apiClient'; // Import the new 'from' function
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const usePetsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.pets(tenantKey, params),
    queryFn: async () => {
      try {
        const { data, error } = await from('pets').select('*').get(); // New API call
        if (error) throw new Error(error.message);
        return Array.isArray(data) ? data : (data?.data ?? data ?? []);
      } catch (e) {
        console.warn('[pets] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });
};

export const usePetDetailsQuery = (petId, options = {}) => {
  const tenantKey = useTenantKey();
  const { enabled = Boolean(petId), ...queryOptions } = options;
  return useQuery({
    queryKey: [...queryKeys.pets(tenantKey), petId],
    queryFn: async () => {
      try {
        const { data, error } = await from('pets').select('*').eq('id', petId).get(); // New API call
        if (error) throw new Error(error.message);
        return Array.isArray(data) ? data[0] : (data?.data?.[0] ?? data ?? null);
      } catch (e) {
        console.warn('[pet] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
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
    mutationFn: async (payload) => {
      const { data, error } = await from('pets').update(payload).eq('id', petId); // New API call
      if (error) throw new Error(error.message);
      return data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);
      if (previous) {
        queryClient.setQueryData(listKey, (old = []) =>
          old.map((pet) =>
            pet.recordId === petId
              ? { ...pet, ...payload }
              : pet
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
    },
  });
};

export const useDeletePetMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.pets(tenantKey, {});
  return useMutation({
    mutationFn: async (petId) => {
      const { error } = await from('pets').delete().eq('id', petId); // New API call
      if (error) throw new Error(error.message);
      return petId;
    },
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
    mutationFn: async (payload) => {
      const { data, error } = await from('pets').insert(payload); // New API call
      if (error) throw new Error(error.message);
      return data;
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
