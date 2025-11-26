import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { listQueryDefaults } from '@/lib/queryConfig';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useBookingsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.bookings(tenantKey, params),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/bookings', { params });
        return res.data;
      } catch (e) {
        console.warn('[bookings] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
    placeholderData: (previousData) => previousData,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(tenantKey) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(tenantKey) });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.payments(tenantKey, {}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(tenantKey) });
    },
  });
};
