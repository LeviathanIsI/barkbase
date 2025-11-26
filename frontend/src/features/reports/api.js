import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Fetch main dashboard report metrics
 * Uses /api/v1/reports/dashboard endpoint
 */
export const useReportDashboard = (params = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: queryKeys.reports.dashboard(tenantKey, params),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/reports/dashboard');
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch revenue report data
 */
export const useRevenueReport = ({ startDate, endDate } = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'reports', 'revenue', { startDate, endDate }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/api/v1/reports/revenue', { params });
      return response.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch occupancy report data
 */
export const useOccupancyReport = ({ startDate, endDate } = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'reports', 'occupancy', { startDate, endDate }],
    queryFn: async () => {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await apiClient.get('/api/v1/reports/occupancy', { params });
      return response.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch arrivals report
 */
export const useArrivalsReport = (days = 7, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'reports', 'arrivals', days],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/reports/arrivals', { params: { days } });
      return response.data?.arrivals || [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

/**
 * Fetch departures report
 */
export const useDeparturesReport = (days = 7, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [tenantKey, 'reports', 'departures', days],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/reports/departures', { params: { days } });
      return response.data?.departures || [];
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};
