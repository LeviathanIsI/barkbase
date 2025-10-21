import { useQuery } from '@tanstack/react-query';
// import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO: All reports require dedicated Lambdas for data aggregation.
// These have been disabled until the backend is implemented.
const disabledQuery = () => Promise.resolve(null);

export const useReportDashboard = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: queryKeys.reports.dashboard(tenantKey, params),
    queryFn: disabledQuery, // apiClient(`/api/v1/reports/dashboard${queryString ? `?${queryString}` : ''}`),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
