import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const updateBooking = (bookingId, payload) =>
  apiClient(`/api/v1/bookings/${bookingId}`, { method: 'PUT', body: payload });

export const promoteFromWaitlist = (bookingId, payload = {}) =>
  apiClient(`/api/v1/bookings/waitlist/${bookingId}/promote`, {
    method: 'POST',
    body: payload,
  });

export const useBookingsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.bookings(tenantKey, params),
    queryFn: () =>
      apiClient(`/api/v1/bookings${params?.status ? `?status=${params.status}` : ''}`),
    staleTime: 30 * 1000,
  });
};

export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: (payload) => apiClient('/api/v1/bookings', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    },
  });
};

export const useUpdateBookingMutation = (bookingId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: (payload) =>
      apiClient(`/api/v1/bookings/${bookingId}`, { method: 'PUT', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    },
  });
};

export const useDeleteBookingMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: (bookingId) => apiClient(`/api/v1/bookings/${bookingId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    },
  });
};

export const useUpdateBookingStatusMutation = (bookingId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: (status) =>
      apiClient(`/api/v1/bookings/${bookingId}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
    },
  });
};

export const useQuickCheckInMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: (payload) => apiClient('/api/v1/check-in/quick', { method: 'POST', body: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'bookings'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats(tenantKey) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.occupancy(tenantKey) });
      queryClient.invalidateQueries({ queryKey: queryKeys.kennels(tenantKey) });
    },
  });
};
