import { useQuery } from '@tanstack/react-query';
// import { apiClient } from '@/lib/apiClient'; // Replaced with `from` or custom Lambdas
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO: Create a dedicated Lambda (/dashboard/stats) for this aggregation query.
const disabledQuery = () => Promise.resolve(null);

export const useDashboardStats = () => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: queryKeys.dashboard.stats(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/stats'),
    staleTime: 60 * 1000,
    enabled: isAuthenticated,
  });
};

export const useDashboardOccupancy = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: queryKeys.dashboard.occupancy(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/occupancy'),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
    ...options,
  });
};

export const useDashboardVaccinations = ({ limit } = {}, options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return useQuery({
    queryKey: [...queryKeys.dashboard.vaccinations(tenantKey), { limit }],
    queryFn: disabledQuery, // apiClient(`/api/v1/dashboard/vaccinations${limit ? `?limit=${limit}` : ''}`),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
    ...options,
  });
};

export const useShiftHandoff = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return useQuery({
    queryKey: queryKeys.dashboard.shiftHandoff(tenantKey),
    queryFn: disabledQuery,
    staleTime: 2 * 60 * 1000,
    enabled: isAuthenticated,
    ...options,
  });
};

export const useEmergencyAccess = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return useQuery({
    queryKey: queryKeys.dashboard.emergencyAccess(tenantKey),
    queryFn: disabledQuery,
    staleTime: 30 * 60 * 1000,
    enabled: isAuthenticated,
    ...options,
  });
};

export const useWellnessMonitoring = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.dashboard.wellnessMonitoring(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/wellness-monitoring'),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

export const useParentCommunication = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.dashboard.parentCommunication(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/parent-communication'),
    staleTime: 10 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

export const useFacilityHeatmap = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.dashboard.facilityHeatmap(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/facility-heatmap'),
    staleTime: 2 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

export const useRevenueOptimizer = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.dashboard.revenueOptimizer(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/revenue-optimizer'),
    staleTime: 30 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

export const useSocialCompatibility = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.dashboard.socialCompatibility(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/social-compatibility'),
    staleTime: 15 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

export const useStaffingIntelligence = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.dashboard.staffingIntelligence(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/staffing-intelligence'),
    staleTime: 10 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

export const useCustomerCLV = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.dashboard.customerCLV(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/customer-clv'),
    staleTime: 60 * 60 * 1000, // 1 hour
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

export const useIncidentAnalytics = (options = {}) => {
  const tenantKey = useTenantKey();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: queryKeys.dashboard.incidentAnalytics(tenantKey),
    queryFn: disabledQuery, // apiClient('/api/v1/dashboard/incident-analytics'),
    staleTime: 30 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};
