import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

export const saveTenantTheme = (payload) =>
  apiClient('/api/v1/tenants/current/theme', {
    method: 'PUT',
    body: payload,
  });

const useTenantKey = () => useTenantStore((state) => state.tenant?.id ?? 'default');

export const useOnboardingStatus = () => {
  const tenantId = useTenantKey();
  return useQuery({
    queryKey: queryKeys.onboarding(tenantId),
    queryFn: () => apiClient('/api/v1/tenants/current/onboarding'),
    staleTime: 60 * 1000,
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
