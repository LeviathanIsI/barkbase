import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO: Create/add endpoints for additional booking actions as needed

export const useBookingsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.bookings(tenantKey, params),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/bookings', { params });
      return res.data;
    },
    staleTime: 30 * 1000,
  });
};

export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/api/v1/bookings', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    },
  });
};

export const useUpdateBookingMutation = (bookingId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(`/api/v1/bookings/${bookingId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    },
  });
};

export const useDeleteBookingMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async (bookingId) => {
      await apiClient.delete(`/api/v1/bookings/${bookingId}`);
      return bookingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    },
  });
};

// TODO: The following mutations require dedicated Lambda functions for custom business logic.
// They cannot be handled by the generic CRUD client.
/*
export const useUpdateBookingStatusMutation = (bookingId) => { ... };
export const useQuickCheckInMutation = () => { ... };
*/

export const useBookingCheckInMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async ({ bookingId, payload }) => {
      const res = await apiClient.post(`/api/v1/bookings/${bookingId}/checkin`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
      // Invalidate other relevant queries like dashboard stats if needed
    },
  });
};

export const useBookingCheckOutMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async ({ bookingId, payload }) => {
      const res = await apiClient.post(`/api/v1/bookings/${bookingId}/checkout`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
      // Invalidate payments and dashboard queries as well
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(tenantKey, {}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(tenantKey) });
    },
  });
};

/*
export const useIncidentsQuery = ({ bookingId, petId } = {}) => { ... };
export const useCapturePaymentMutation = () => { ... };
*/
