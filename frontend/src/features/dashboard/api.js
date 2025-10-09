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

export const useShiftHandoff = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.shiftHandoff(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/shift-handoff'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

export const useEmergencyAccess = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.emergencyAccess(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/emergency-access'),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

export const useWellnessMonitoring = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.wellnessMonitoring(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/wellness-monitoring'),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useParentCommunication = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.parentCommunication(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/parent-communication'),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

export const useFacilityHeatmap = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.facilityHeatmap(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/facility-heatmap'),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
};

export const useRevenueOptimizer = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.revenueOptimizer(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/revenue-optimizer'),
    staleTime: 30 * 60 * 1000,
    ...options,
  });
};

export const useSocialCompatibility = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.socialCompatibility(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/social-compatibility'),
    staleTime: 15 * 60 * 1000,
    ...options,
  });
};

export const useStaffingIntelligence = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.staffingIntelligence(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/staffing-intelligence'),
    staleTime: 10 * 60 * 1000,
    ...options,
  });
};

export const useCustomerCLV = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.customerCLV(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/customer-clv'),
    staleTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
};

export const useIncidentAnalytics = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.dashboard.incidentAnalytics(tenantKey),
    queryFn: () => apiClient('/api/v1/dashboard/incident-analytics'),
    staleTime: 30 * 60 * 1000,
    ...options,
  });
};
