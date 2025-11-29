import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
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
 * Fetch calendar events for a date range
 * Aggregates bookings, runs, and tasks into unified calendar events
 */
export const useCalendarEventsQuery = ({ start, end, types }) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.calendar(tenantKey, { start, end, types }),
    queryFn: async () => {
      const params = { start, end };
      if (types) params.types = types;

      const response = await apiClient.get('/api/v1/calendar/events', { params });
      return response.data?.events || [];
    },
    enabled: Boolean(start && end) && isTenantReady,
    staleTime: 30 * 1000,
  });
};

/**
 * Legacy alias for useCalendarEventsQuery
 * Supports both 'from/to' and 'start/end' naming
 */
export const useCalendarViewQuery = ({ from, to, start, end }) => {
  const startDate = start || from;
  const endDate = end || to;
  return useCalendarEventsQuery({ start: startDate, end: endDate });
};

/**
 * Fetch occupancy data for a date range
 */
export const useOccupancyQuery = ({ from, to, start, end }) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  const startDate = start || from;
  const endDate = end || to;

  return useQuery({
    queryKey: queryKeys.occupancy(tenantKey, { start: startDate, end: endDate }),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/calendar/occupancy', {
        params: { start: startDate, end: endDate }
      });
      return response.data;
    },
    enabled: Boolean(startDate && endDate) && isTenantReady,
    staleTime: 30 * 1000,
  });
};

/**
 * Suggest kennel for a booking (stub - not yet implemented)
 */
export const useSuggestKennelQuery = (params, options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.suggestKennel(tenantKey, params),
    queryFn: async () => null, // Not implemented yet
    enabled: false,
    staleTime: 60 * 1000,
  });
};

/**
 * Assign kennel mutation (stub - not yet implemented)
 */
export const useAssignKennelMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      throw new Error('Kennel assignment not yet implemented');
    },
    onSuccess: () => {
      // invalidate queries
    },
  });
};

/**
 * Reassign kennel mutation (stub - not yet implemented)
 */
export const useReassignKennelMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      throw new Error('Kennel reassignment not yet implemented');
    },
    onSuccess: () => {
      // invalidate queries
    },
  });
};
