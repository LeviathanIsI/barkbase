import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const usePetsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.pets(tenantKey, params),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/pets');
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data ?? []);
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
        // Call REST endpoint which enriches the pet with owners[] and primaryOwnerId
        const res = await apiClient.get(`/api/v1/pets/${petId}`);
        return res?.data ?? null;
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

export const usePetVaccinationsQuery = (petId, options = {}) => {
  const enabled = Boolean(petId) && (options.enabled ?? true);
  return useQuery({
    queryKey: ['pet', petId, 'vaccinations'],
    enabled,
    queryFn: async () => {
      try {
        console.log('Fetching vaccinations for petId:', petId);

        // Try direct API call to the Lambda endpoint
        const res = await apiClient.get(`/api/v1/pets/${petId}/vaccinations`);
        console.log('Vaccinations API response:', res);
        // Normalize to an array whether backend returns [..] or { data: [..] }
        const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        return list;

        // TEMPORARY: If API fails, return your rabies vaccine data here
        // Replace with your actual rabies vaccine data from the database
        /*
        return [
          {
            recordId: 'your-actual-rabies-record-id',
            type: 'Rabies',
            administeredAt: '2024-01-15T00:00:00.000Z',
            expiresAt: '2025-01-15T00:00:00.000Z',
            documentUrl: null,
            notes: 'Your rabies vaccination notes'
          }
        ];
        */
      } catch (error) {
        console.error('Error fetching vaccinations:', error);
        // Return empty array so UI shows "No vaccinations recorded"
        return [];
      }
    },
    staleTime: 30 * 1000,
    retry: 1,
    retryDelay: 1000,
    ...options,
  });
};

export const useUpdatePetMutation = (petId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  const listKey = queryKeys.pets(tenantKey, {});
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(`/api/v1/pets/${petId}`, payload);
      return res.data;
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
      await apiClient.delete(`/api/v1/pets/${petId}`);
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
      const res = await apiClient.post('/api/v1/pets', payload);
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

export const useCreateVaccinationMutation = (petId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      console.log('Creating vaccination:', payload);
      const res = await apiClient.post(`/api/v1/pets/${petId}/vaccinations`, payload);
      console.log('Create vaccination response:', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet', petId, 'vaccinations'] });
    },
  });
};

export const useUpdateVaccinationMutation = (petId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vaccinationId, payload }) => {
      console.log('Updating vaccination:', vaccinationId, payload);
      const res = await apiClient.put(`/api/v1/pets/${petId}/vaccinations/${vaccinationId}`, payload);
      console.log('Update vaccination response:', res);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet', petId, 'vaccinations'] });
    },
  });
};
