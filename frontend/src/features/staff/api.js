import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useStaffQuery = () => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.staff(tenantKey),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/staff');
      return res.data;
    },
  });
};

export const useStaffStatusMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async ({ staffId, isActive }) => {
      const res = await apiClient.put(`/api/v1/staff/${staffId}`, { isActive });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(tenantKey) });
    },
  });
};
