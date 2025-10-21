import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { from } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO: All functions in this file require dedicated Lambdas for calendar-specific logic.
const disabledQuery = () => Promise.resolve(null);

export const useCalendarViewQuery = ({ from, to }) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  
  return useQuery({
    queryKey: queryKeys.calendar(tenantKey, { from, to }),
    queryFn: disabledQuery, // apiClient(`/api/v1/calendar?${params.toString()}`),
    enabled: Boolean(from && to && isAuthenticated),
    staleTime: 30 * 1000,
  });
};

export const useOccupancyQuery = ({ from, to }) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: queryKeys.occupancy(tenantKey, { from, to }),
    queryFn: disabledQuery, // apiClient(`/api/v1/calendar/occupancy?${params.toString()}`),
    enabled: Boolean(from && to && isAuthenticated),
    staleTime: 30 * 1000,
  });
};

export const useSuggestKennelQuery = (params, options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.suggestKennel(tenantKey, params),
    queryFn: disabledQuery, // apiClient(`/api/v1/calendar/suggest-kennel?${params.toString()}`),
    enabled: false, // Disabled until backend is implemented
    staleTime: 60 * 1000,
  });
};

export const useAssignKennelMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disabledQuery, // Custom logic needed
    onSuccess: () => {
      // invalidate queries
    },
  });
};

export const useReassignKennelMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disabledQuery, // Custom logic needed
    onSuccess: () => {
      // invalidate queries
    },
  });
};
