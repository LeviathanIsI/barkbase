import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useReportDashboard = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const queryString = search.toString();
  return useQuery({
    queryKey: queryKeys.reports.dashboard(tenantKey, params),
    queryFn: () =>
      apiClient(`/api/v1/reports/dashboard${queryString ? `?${queryString}` : ''}`),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
