import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Check if tenant is ready for API calls
 * Queries should be disabled until tenantId is available
 */
const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

/**
 * Get all payments
 *
 * Backend response shape (from financial-service /api/v1/financial/payments):
 * {
 *   data: { payments: [...] },
 *   payments: [...],  // Compatibility
 *   total: number,
 * }
 *
 * Each payment:
 * {
 *   id, amount, status, paymentMethod, customerName, createdAt
 * }
 */
export const usePaymentsQuery = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.payments(tenantKey, params),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.payments.list, { params });
        const data = res.data;

        // Normalize - backend returns both data.payments and payments
        const payments = data?.data?.payments || data?.payments || (Array.isArray(data?.data) ? data.data : []);

        return {
          payments,
          total: data?.total || payments.length,
        };
      } catch (e) {
        console.warn('[payments] Error fetching:', e?.message);
        return { payments: [], total: 0 };
      }
    },
    enabled: isTenantReady,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Get single payment
 */
export const usePaymentQuery = (paymentId, options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [tenantKey, 'payments', paymentId],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.payments.detail(paymentId));
      return res.data;
    },
    enabled: isTenantReady && !!paymentId,
    ...options,
  });
};

/**
 * Payment summary query
 * Uses billing summary endpoint from financial-service
 */
export const usePaymentSummaryQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.paymentsSummary(tenantKey),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.billing.summary);
        const data = res.data?.data || res.data || {};
        return {
          currentBalance: data.currentBalance || 0,
          lastPaymentDate: data.lastPaymentDate,
          lastPaymentAmount: data.lastPaymentAmount || 0,
        };
      } catch (e) {
        console.warn('[payment-summary] Error:', e?.message);
        return { currentBalance: 0, lastPaymentDate: null, lastPaymentAmount: 0 };
      }
    },
    enabled: isTenantReady,
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Create payment
 */
export const useCreatePaymentMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(canonicalEndpoints.payments.list, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(tenantKey, {}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentsSummary(tenantKey) });
    },
  });
};

/**
 * Refund payment
 */
export const useRefundPaymentMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ paymentId, amount }) => {
      const res = await apiClient.post(canonicalEndpoints.payments.refund(paymentId), { amount });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(tenantKey, {}) });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'payments', variables.paymentId] });
    },
  });
};
