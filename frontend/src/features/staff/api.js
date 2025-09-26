import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useStaffQuery = () => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.staff(tenantKey),
    queryFn: () => apiClient('/api/v1/staff'),
  });
};

export const useStaffStatusMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: ({ staffId, isActive }) =>
      apiClient(`/api/v1/staff/${staffId}/status`, {
        method: 'PATCH',
        body: { isActive },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(tenantKey) });
    },
  });
};
