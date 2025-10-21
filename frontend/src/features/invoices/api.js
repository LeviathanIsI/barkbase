import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * Get all invoices
 */
export const useInvoicesQuery = (filters = {}) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/invoices', { params: filters });
      return response.data;
    }
  });
};

/**
 * Get single invoice
 */
export const useInvoiceQuery = (invoiceId) => {
  return useQuery({
    queryKey: ['invoices', invoiceId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/invoices/${invoiceId}`);
      return response.data;
    },
    enabled: !!invoiceId
  });
};

/**
 * Generate invoice from booking
 */
export const useGenerateInvoiceMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId) => {
      const response = await apiClient.post(`/api/v1/invoices/generate/${bookingId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });
};

/**
 * Send invoice email
 */
export const useSendInvoiceEmailMutation = () => {
  return useMutation({
    mutationFn: async (invoiceId) => {
      const response = await apiClient.post(`/api/v1/invoices/${invoiceId}/send-email`);
      return response.data;
    }
  });
};

/**
 * Mark invoice as paid
 */
export const useMarkInvoicePaidMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, paymentCents }) => {
      const response = await apiClient.put(`/api/v1/invoices/${invoiceId}/paid`, { paymentCents });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', variables.invoiceId] });
    }
  });
};

