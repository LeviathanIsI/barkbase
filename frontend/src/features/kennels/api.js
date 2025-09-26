import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useKennelAvailability = (params = {}) => {
  const tenantKey = useTenantKey();
  const search = params.date ? `?date=${encodeURIComponent(params.date)}` : '';
  return useQuery({
    queryKey: queryKeys.kennels(tenantKey, params),
    queryFn: () => apiClient(`/api/v1/kennels/availability${search}`),
    staleTime: 30 * 1000,
  });
};
