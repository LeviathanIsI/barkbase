import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO: Refactor to a dedicated Lambda for availability logic
// export const useKennelAvailability = (params = {}) => { ... };

export const useKennels = (filters = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: ['kennels', tenantKey, filters],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/kennels', { params: filters });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });
};

export const useKennelsWithOccupancy = () => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: ['kennels', tenantKey, 'occupancy'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/kennels/occupancy');
      return res.data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - occupancy changes frequently
    enabled: isAuthenticated,
  });
};

export const useKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: ['kennels', tenantKey, kennelId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/kennels/${kennelId}`);
      return res.data;
    },
    enabled: isAuthenticated && !!kennelId,
  });
};

export const useCreateKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/api/v1/kennels', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
    },
  });
};

export const useUpdateKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(`/api/v1/kennels/${kennelId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey, kennelId] });
    },
  });
};

export const useDeleteKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kennelId) => {
      await apiClient.delete(`/api/v1/kennels/${kennelId}`);
      return kennelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
    },
  });
};

// TODO: Refactor to a dedicated Lambda for availability logic
// export const useCheckKennelAvailability = (kennelId) => { ... };
