import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const usePaymentsQuery = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const query = { ...params };
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const queryString = search.toString();
  return useQuery({
    queryKey: queryKeys.payments(tenantKey, params),
    queryFn: () =>
      apiClient(`/api/v1/payments${queryString ? `?${queryString}` : ''}`),
    keepPreviousData: true,
    ...options,
  });
};

export const usePaymentSummaryQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.paymentsSummary(tenantKey),
    queryFn: () => apiClient('/api/v1/payments/summary'),
    staleTime: 60 * 1000,
    ...options,
  });
};
