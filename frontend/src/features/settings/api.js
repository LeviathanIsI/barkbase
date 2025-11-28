import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// Properties API (v2-only)
// All Properties CRUD and advanced operations use the v2 endpoints.
export const usePropertiesQuery = (objectType, options = {}) => {
  const tenantKey = useTenantKey();
  const { includeUsage = false, includeDependencies = false, includeArchived = false } = options;

  return useQuery({
    queryKey: queryKeys.properties(tenantKey, { objectType }),
    queryFn: async () => {
      const params = new URLSearchParams({
        objectType,
        includeUsage: includeUsage.toString(),
        includeDependencies: includeDependencies.toString(),
        includeArchived: includeArchived.toString(),
      });
      const res = await apiClient.get(`${canonicalEndpoints.properties.list}?${params.toString()}`);
      // v2 returns { properties: [], metadata: {...} }
      const data = res.data;
      return Array.isArray(data) ? data : (data?.properties || []);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!objectType,
    ...options,
  });
};

// Properties API v2 (with rich metadata, usage stats, dependencies)
export const usePropertiesV2Query = (objectType, options = {}) => {
  const tenantKey = useTenantKey();
  const { includeUsage = true, includeDependencies = false, includeArchived = false } = options;
  
  return useQuery({
    queryKey: [...queryKeys.properties(tenantKey, { objectType }), 'v2', { includeUsage, includeDependencies, includeArchived }],
    queryFn: async () => {
      const params = new URLSearchParams({
        objectType,
        includeUsage: includeUsage.toString(),
        includeDependencies: includeDependencies.toString(),
        includeArchived: includeArchived.toString(),
      });
      const res = await apiClient.get(`${canonicalEndpoints.properties.list}?${params.toString()}`);
      // v2 returns { properties: [], metadata: {...} }
      const data = res.data;
      return Array.isArray(data) ? data : (data?.properties || []);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!objectType,
    ...options,
  });
};

// Create property (v2 payload format)
export const useCreatePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (propertyData) => {
      // v2 payload expects: propertyName, displayLabel, objectType, propertyType, dataType
      const res = await apiClient.post(canonicalEndpoints.properties.create, propertyData);
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate the properties list for this object type
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.properties(tenantKey, { objectType: data.objectType }) 
      });
    },
  });
};

// Update property (v2 payload format)
export const useUpdatePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ propertyId, ...propertyData }) => {
      // v2 payload expects: displayLabel, description, propertyGroup
      const res = await apiClient.patch(canonicalEndpoints.properties.update(propertyId), propertyData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.properties(tenantKey, { objectType: data.objectType }) 
      });
    },
  });
};

// Delete property (uses v2 archive with cascade)
// v2 does not have hard delete; use archive instead.
export const useDeletePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ propertyId, objectType, reason = 'Deleted via UI' }) => {
      // Use archive endpoint for deletion (v2 soft-delete)
      const res = await apiClient.post(canonicalEndpoints.properties.archive(propertyId), {
        reason,
        confirmed: true,
        cascadeStrategy: 'cancel',
      });
      return { propertyId, objectType, ...res.data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.properties(tenantKey, { objectType: data.objectType }) 
      });
    },
  });
};

// Archive property (soft delete with cascade strategies)
export const useArchivePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ propertyId, reason, confirmed = true, cascadeStrategy = 'cancel' }) => {
      const res = await apiClient.post(canonicalEndpoints.properties.archive(propertyId), {
        reason,
        confirmed,
        cascadeStrategy,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties(tenantKey, {}) });
    },
  });
};

// Restore property (from soft delete or archive)
export const useRestorePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (propertyId) => {
      const res = await apiClient.post(canonicalEndpoints.properties.restore(propertyId));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties(tenantKey, {}) });
    },
  });
};

// Get dependency graph for a property
export const useDependencyGraphQuery = (propertyId, options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: ['dependencies', tenantKey, propertyId],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.properties.dependencies(propertyId));
      return res.data;
    },
    enabled: !!propertyId,
    ...options,
  });
};

// Get impact analysis for a property
export const useImpactAnalysisMutation = () => {
  return useMutation({
    mutationFn: async ({ propertyId, modificationType = 'delete' }) => {
      const res = await apiClient.post(canonicalEndpoints.properties.impactAnalysis(propertyId), {
        modificationType,
      });
      return res.data;
    },
  });
};

// Get permission profiles
export const usePermissionProfilesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: ['profiles', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/profiles');
      return res.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};



// Services API (prefer using features/services/api.js)
export const useServicesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.services(tenantKey),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/services');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/*
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
*/


// Staff API (prefer using features/staff/api.js)
export const useStaffQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.staff(tenantKey),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/staff');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/*
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
*/


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
    queryFn: disabledQuery, // Needs custom Lambda
    enabled: false,
    ...options,
  });
};

// Reports API
// TODO: All reports require dedicated Lambdas for data aggregation.
// These have been disabled until the backend is implemented.
const disabledQuery = () => Promise.resolve(null);

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
    queryFn: disabledQuery, // Needs custom Lambda
    enabled: false,
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
    queryFn: disabledQuery, // Needs custom Lambda
    enabled: false,
    ...options,
  });
};

// Members API
export const useMembersQuery = () => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: ['members', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/memberships');
      return res.data;
    },
  });
};

export const useUpdateMemberRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, role }) => {
      const res = await apiClient.put(`/api/v1/memberships/${membershipId}`, { role });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

export const useRemoveMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId) => {
      const res = await apiClient.delete(`/api/v1/memberships/${membershipId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

// Invites API
export const useInviteMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteData) => {
      const res = await apiClient.post('/api/v1/invites', inviteData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate members query to refetch with new invites
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};