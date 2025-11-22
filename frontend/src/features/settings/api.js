import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
// Properties API v1 (Legacy)
export const usePropertiesQuery = (objectType, options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.properties(tenantKey, { objectType }),
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/properties?objectType=${objectType}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!objectType,
    ...options,
  });
};

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
// Properties API v2 (Enterprise - with rich metadata, usage stats, dependencies)
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
      const res = await apiClient.get(`/api/v2/properties?${params.toString()}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!objectType,
    ...options,
  });
};

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
export const useCreatePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (propertyData) => {
      const res = await apiClient.post('/api/v1/properties', propertyData);
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

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
export const useUpdatePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ propertyId, ...propertyData }) => {
      const res = await apiClient.patch(`/api/v1/properties/${propertyId}`, propertyData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.properties(tenantKey, { objectType: data.objectType }) 
      });
    },
  });
};

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
export const useDeletePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ propertyId, objectType }) => {
      await apiClient.delete(`/api/v1/properties/${propertyId}`);
      return { propertyId, objectType };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.properties(tenantKey, { objectType: data.objectType }) 
      });
    },
  });
};

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
// Archive property (v2 - soft delete with cascade strategies)
export const useArchivePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ propertyId, reason, confirmed = true, cascadeStrategy = 'cancel' }) => {
      const res = await apiClient.post(`/api/v2/properties/${propertyId}/archive`, {
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

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
// Restore property (v2 - from soft delete or archive)
export const useRestorePropertyMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (propertyId) => {
      const res = await apiClient.post(`/api/v2/properties/${propertyId}/restore`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties(tenantKey, {}) });
    },
  });
};

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
// Get dependency graph for a property
export const useDependencyGraphQuery = (propertyId, options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: ['dependencies', tenantKey, propertyId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v2/properties/${propertyId}/dependencies`);
      return res.data;
    },
    enabled: !!propertyId,
    ...options,
  });
};

// TODO (Consolidation Phase): Properties use mixed v1 (CRUD) + v2 (advanced).
// Keep these as-is until the backend consolidation is complete.
// Get impact analysis for a property
export const useImpactAnalysisMutation = () => {
  return useMutation({
    mutationFn: async ({ propertyId, modificationType = 'delete' }) => {
      const res = await apiClient.post(`/api/v2/properties/${propertyId}/impact-analysis`, {
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

/*
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
*/


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
      const response = await fetch('/api/v1/memberships');
      if (!response.ok) throw new Error('Failed to fetch members');
      return response.json();
    },
  });
};

export const useUpdateMemberRoleMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ membershipId, role }) => {
      const response = await fetch(`/api/v1/memberships/${membershipId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) throw new Error('Failed to update member role');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

export const useRemoveMemberMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (membershipId) => {
      const response = await fetch(`/api/v1/memberships/${membershipId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove member');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

// Invites API
export const useInviteMemberMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (inviteData) => {
      const response = await fetch('/api/v1/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      });
      if (!response.ok) {
        throw new Error('Failed to send invite');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate members query to refetch with new invites
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};