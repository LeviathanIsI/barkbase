import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

export const saveTenantTheme = (payload) =>
  apiClient('/api/v1/tenants/current/theme', {
    method: 'PUT',
    body: payload,
  });

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useOnboardingStatus = () => {
  const tenantId = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.onboarding(tenantId),
    queryFn: () => apiClient('/api/v1/tenants/current/onboarding'),
    staleTime: 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
  });
};

export const useOnboardingDismissMutation = () => {
  const queryClient = useQueryClient();
  const tenantId = useTenantKey();
  return useMutation({
    mutationFn: (dismissed) =>
      apiClient('/api/v1/tenants/current/onboarding', {
        method: 'PATCH',
        body: { dismissed },
      }),
    onSuccess: (payload) => {
      queryClient.setQueryData(queryKeys.onboarding(tenantId), payload);
    },
  });
};
