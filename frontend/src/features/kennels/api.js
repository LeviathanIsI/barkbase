import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useKennelAvailability = (params = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  const search = params.date ? `?date=${encodeURIComponent(params.date)}` : '';
  return useQuery({
    queryKey: queryKeys.kennels(tenantKey, params),
    queryFn: () => apiClient(`/api/v1/kennels/availability${search}`),
    staleTime: 30 * 1000,
    enabled: isAuthenticated && !!accessToken,
  });
};

export const useKennels = (filters = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const search = params.toString() ? `?${params.toString()}` : '';

  return useQuery({
    queryKey: ['kennels', tenantKey, filters],
    queryFn: () => apiClient(`/api/v1/kennels${search}`),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
  });
};

export const useKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['kennels', tenantKey, kennelId],
    queryFn: () => apiClient(`/api/v1/kennels/${kennelId}`),
    enabled: isAuthenticated && !!accessToken && !!kennelId,
  });
};

export const useCreateKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.post('/api/v1/kennels', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      queryClient.invalidateQueries({ queryKey: queryKeys.kennels(tenantKey) });
    },
  });
};

export const useUpdateKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiClient.put(`/api/v1/kennels/${kennelId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey, kennelId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.kennels(tenantKey) });
    },
  });
};

export const useDeleteKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (kennelId) => apiClient.delete(`/api/v1/kennels/${kennelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      queryClient.invalidateQueries({ queryKey: queryKeys.kennels(tenantKey) });
    },
  });
};

export const useCheckKennelAvailability = (kennelId) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useMutation({
    mutationFn: ({ startDate, endDate }) => 
      apiClient(`/api/v1/kennels/${kennelId}/availability?startDate=${startDate}&endDate=${endDate}`),
  });
};
