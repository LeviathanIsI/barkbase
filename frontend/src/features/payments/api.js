import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const usePaymentsQuery = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.payments(tenantKey, params),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/payments', { params });
      return res.data;
    },
    keepPreviousData: true,
    ...options,
  });
};

// TODO: This requires a dedicated Lambda for aggregation.
export const usePaymentSummaryQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.paymentsSummary(tenantKey),
    queryFn: () => Promise.resolve(null), // apiClient('/api/v1/payments/summary'),
    staleTime: 60 * 1000,
    ...options,
  });
};
