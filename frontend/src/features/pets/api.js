import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { listQueryDefaults, detailQueryDefaults } from '@/lib/queryConfig';

const useTenantId = () => useTenantStore((state) => state.tenant?.recordId ?? 'unknown');

const normalizePetsResponse = (data) => {
  if (Array.isArray(data)) {
    return { pets: data, total: data.length, raw: data };
  }
  if (data && Array.isArray(data.items)) {
    return { pets: data.items, total: data.total ?? data.items.length, raw: data };
  }
  if (data && Array.isArray(data.pets)) {
    return { pets: data.pets, total: data.total ?? data.pets.length, raw: data };
  }
  if (data && Array.isArray(data.data)) {
    return { pets: data.data, total: data.total ?? data.data.length, raw: data };
  }
  return { pets: [], total: 0, raw: data ?? null };
};

const ensurePetsArray = (result) => {
  if (result && Array.isArray(result.pets)) {
    return result;
  }
  console.warn('[PETS API WARNING] Normalized pets is not an array. Falling back to empty list.', { result });
  return { pets: [], total: 0, raw: result?.raw ?? result ?? null };
};

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
  return { pets: [], total: data.total ?? 0, raw: data.raw ?? data };
};

export const usePetsQuery = (params = {}) => {
  const tenantId = useTenantId();
  
  return useQuery({
    queryKey: queryKeys.pets(tenantId),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.pets.list, { params });
        const normalized = normalizePetsResponse(res?.data);
        return ensurePetsArray(normalized);
      } catch (e) {
        console.warn('[pets] Falling back to empty list due to API error:', e?.message || e);
        return { pets: [], total: 0, raw: null };
      }
    },
    ...listQueryDefaults,
    // Keep previous data during background refetch
    placeholderData: (previousData) => previousData,
  });
};

export const usePetDetailsQuery = (petId, options = {}) => {
  const tenantId = useTenantId();
  const { enabled = Boolean(petId), ...queryOptions } = options;
  
  return useQuery({
    queryKey: ['pets', { tenantId }, petId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.pets.detail(petId));
        return res?.data ?? null;
      } catch (e) {
        console.warn('[pet] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled,
    ...detailQueryDefaults,
    placeholderData: (previousData) => previousData,
    ...queryOptions,
  });
};

export const usePetQuery = (petId, options = {}) => usePetDetailsQuery(petId, options);

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
    placeholderData: (previousData) => previousData,
    ...options,
  });
};

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
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ['pets', { tenantId }, petId] });
    },
  });
};

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
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
};

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
