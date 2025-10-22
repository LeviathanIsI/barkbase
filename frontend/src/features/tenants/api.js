import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

export const saveTenantTheme = (payload) =>
  apiClient.put('/api/v1/tenants/current/theme', payload);

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useOnboardingStatus = () => {
  const tenantId = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.onboarding(tenantId),
    queryFn: () => apiClient.get('/api/v1/tenants/current/onboarding'),
    staleTime: 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
  });
};

export const useOnboardingDismissMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantKey();
  return useMutation({
    mutationFn: (dismissed) => apiClient.patch('/api/v1/tenants/current/onboarding', { dismissed }),
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.onboarding(tenantId), payload);
    },
  });
};

export const useTenantQuery = (slug) => {
  return useQuery({
    queryKey: queryKeys.tenants(slug),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/tenants', { params: { slug } });
      return res?.data ?? null;
    },
    enabled: !!slug,
  });
};

export const useUpdateTenantMutation = (tenantId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put('/api/v1/tenants/current', payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.slug) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tenants(data.slug) });
      }
    },
  });
};
