import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useCalendarViewQuery = ({ from, to }) => {
  const tenantKey = useTenantKey();
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  return useQuery({
    queryKey: queryKeys.calendar(tenantKey, { from, to }),
    queryFn: () => apiClient(`/api/v1/calendar?${params.toString()}`),
    enabled: Boolean(from && to),
    staleTime: 30 * 1000,
  });
};

export const useOccupancyQuery = ({ from, to }) => {
  const tenantKey = useTenantKey();
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);

  return useQuery({
    queryKey: queryKeys.occupancy(tenantKey, { from, to }),
    queryFn: () => apiClient(`/api/v1/calendar/occupancy?${params.toString()}`),
    enabled: Boolean(from && to),
    staleTime: 30 * 1000,
  });
};

export const useSuggestKennelQuery = ({ startDate, endDate, petSize, kennelType }, options = {}) => {
  const tenantKey = useTenantKey();
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  if (petSize) params.append('petSize', petSize);
  if (kennelType) params.append('kennelType', kennelType);

  return useQuery({
    queryKey: queryKeys.suggestKennel(tenantKey, { startDate, endDate, petSize, kennelType }),
    queryFn: () => apiClient(`/api/v1/calendar/suggest-kennel?${params.toString()}`),
    enabled: Boolean(startDate && endDate) && (options.enabled !== false),
    staleTime: 60 * 1000,
  });
};

export const useAssignKennelMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: ({ bookingId, kennelId, startDate, endDate }) =>
      apiClient(`/api/v1/calendar/bookings/${bookingId}/assign`, {
        method: 'POST',
        body: { kennelId, startDate, endDate },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'calendar'] });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'occupancy'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.kennels(tenantKey) });
    },
  });
};

export const useReassignKennelMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: ({ segmentId, kennelId, startDate, endDate }) => {
      const body = {};
      if (kennelId) body.kennelId = kennelId;
      if (startDate) body.startDate = startDate;
      if (endDate) body.endDate = endDate;

      return apiClient(`/api/v1/calendar/segments/${segmentId}/reassign`, {
        method: 'PATCH',
        body,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'calendar'] });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'occupancy'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.kennels(tenantKey) });
    },
  });
};
