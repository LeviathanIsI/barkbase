import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// Properties API
export const usePropertiesQuery = (objectType, options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.properties(tenantKey, { objectType }),
    queryFn: () => apiClient(`/api/v1/settings/properties?object=${objectType}`),
    enabled: Boolean(objectType),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useCreatePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (propertyData) => apiClient('/api/v1/settings/properties', {
      method: 'POST',
      body: propertyData,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties(tenantKey, {}) });
    },
  });
};

export const useUpdatePropertyMutation = (propertyId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (propertyData) => apiClient(`/api/v1/settings/properties/${propertyId}`, {
      method: 'PATCH',
      body: propertyData,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties(tenantKey, {}) });
    },
  });
};

export const useArchivePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (propertyId) => apiClient(`/api/v1/settings/properties/${propertyId}/archive`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties(tenantKey, {}) });
    },
  });
};

export const useRestorePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (propertyId) => apiClient(`/api/v1/settings/properties/${propertyId}/restore`, {
      method: 'POST',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties(tenantKey, {}) });
    },
  });
};

export const useDeletePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (propertyId) => apiClient(`/api/v1/settings/properties/${propertyId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties(tenantKey, {}) });
    },
  });
};

// Services API
export const useServicesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.services(tenantKey),
    queryFn: () => apiClient('/api/v1/services'),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useCreateServiceMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (serviceData) => apiClient('/api/v1/services', {
      method: 'POST',
      body: serviceData,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services(tenantKey) });
    },
  });
};

export const useUpdateServiceMutation = (serviceId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (serviceData) => apiClient(`/api/v1/services/${serviceId}`, {
      method: 'PUT',
      body: serviceData,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services(tenantKey) });
    },
  });
};

export const useDeleteServiceMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: (serviceId) => apiClient(`/api/v1/services/${serviceId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services(tenantKey) });
    },
  });
};

// Staff API
export const useStaffQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.staff(tenantKey),
    queryFn: () => apiClient('/api/v1/staff'),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useUpdateStaffStatusMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: ({ staffId, status }) => apiClient(`/api/v1/staff/${staffId}/status`, {
      method: 'PATCH',
      body: { status },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff(tenantKey) });
    },
  });
};

// Calendar API
export const useCalendarCapacity = (options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  // Safely access auth store with error handling
  let isAuthenticated = false;
  let accessToken = null;
  try {
    isAuthenticated = useAuthStore((state) => state.isAuthenticated());
    accessToken = useAuthStore((state) => state.accessToken);
  } catch (error) {
    // Auth store not available yet
    console.warn('useAuthStore not available in useCalendarCapacity');
  }

  return useQuery({
    queryKey: [...queryKeys.calendar(tenantKey), 'capacity'],
    queryFn: () => apiClient('/api/v1/calendar/capacity'),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

// Reports API
export const useReportsDashboardQuery = (params = {}, options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  // Safely access auth store with error handling
  let isAuthenticated = false;
  let accessToken = null;
  try {
    isAuthenticated = useAuthStore((state) => state.isAuthenticated());
    accessToken = useAuthStore((state) => state.accessToken);
  } catch (error) {
    // Auth store not available yet
    console.warn('useAuthStore not available in useReportsDashboardQuery');
  }

  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value);
    }
  });
  const queryString = search.toString();

  return useQuery({
    queryKey: queryKeys.reports.dashboard(tenantKey, params),
    queryFn: () => apiClient(`/api/v1/reports/dashboard${queryString ? `?${queryString}` : ''}`),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};

// Bookings insights API (using dashboard stats for now, could be extended)
export const useBookingsInsightsQuery = (options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  // Safely access auth store with error handling
  let isAuthenticated = false;
  let accessToken = null;
  try {
    isAuthenticated = useAuthStore((state) => state.isAuthenticated());
    accessToken = useAuthStore((state) => state.accessToken);
  } catch (error) {
    // Auth store not available yet
    console.warn('useAuthStore not available in useBookingsInsightsQuery');
  }

  return useQuery({
    queryKey: [tenantKey, 'bookings-insights'],
    queryFn: () => apiClient('/api/v1/dashboard/stats'),
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated && !!accessToken,
    ...options,
  });
};