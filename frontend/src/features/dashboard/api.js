import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useDashboardStats = () => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.stats(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/stats'),
    staleTime: 60 * 1000,
  });
};

export const useDashboardOccupancy = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.occupancy(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/occupancy'),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useDashboardVaccinations = ({ limit } = {}, options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: [...queryKeys.dashboard.vaccinations(tenantKey), { limit }],
    queryFn: () => apiClient(`/api/v1/dashboard/vaccinations${limit ? `?limit=${limit}` : ''}`),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
