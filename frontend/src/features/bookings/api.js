import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { from } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO: Create a dedicated Lambda for this custom action
// export const promoteFromWaitlist = (bookingId, payload = {}) =>
//   from('bookings').customAction('promote', { bookingId, payload });

export const useBookingsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.bookings(tenantKey, params),
    queryFn: async () => {
      let query = from('bookings').select('*');
      if (params?.status) {
        query = query.eq('status', params.status);
      }
      const { data, error } = await query.get();
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 30 * 1000,
  });
};

export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async (payload) => {
      const { data, error } = await from('bookings').insert(payload);
      if (error) throw new Error(error.message);
      return data;
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
      const { data, error } = await from('bookings').update(payload).eq('id', bookingId);
      if (error) throw new Error(error.message);
      return data;
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
      const { error } = await from('bookings').delete().eq('id', bookingId);
      if (error) throw new Error(error.message);
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
      // This now calls our dedicated Lambda endpoint
      const { data, error } = await from('bookings').customAction('checkin', { id: bookingId, body: payload });
      if (error) throw new Error(error.message);
      return data;
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
      const { data, error } = await from('bookings').customAction('checkout', { id: bookingId, body: payload });
      if (error) throw new Error(error.message);
      return data;
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
