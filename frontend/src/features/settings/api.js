/**
 * ============================================================================
 * SETTINGS API
 * ============================================================================
 *
 * This module handles Settings-related API calls including:
 * - Properties (custom fields) management
 * - Permission profiles
 * - Services configuration
 * - Staff management
 * - Reports configuration
 * - Members and invites
 * - Billing / Subscriptions (tenant ↔ BarkBase platform billing)
 * - Platform billing invoices (BarkBase → Tenant)
 *
 * NOTE ON INVOICES:
 * - useTenantBillingInvoicesQuery: Platform billing (BarkBase → Tenant), for Settings
 * - useBusinessInvoicesQuery: Business invoices (Tenant → Pet Owners), in @/features/invoices/api.js
 *
 * These are two completely different invoice concepts - do not mix them!
 * ============================================================================
 */

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

// =============================================================================
// PROPERTY VALUES API
// =============================================================================
// Get and set custom field values for entities (pets, owners, bookings, etc.)
// =============================================================================

/**
 * Get all property values for a specific entity
 * Returns both the property definitions and their values for the entity
 */
export const usePropertyValuesQuery = (entityType, entityId, options = {}) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['propertyValues', tenantKey, entityType, entityId],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.propertyValues.get(entityType, entityId));
      return res.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!entityType && !!entityId,
    ...options,
  });
};

/**
 * Bulk upsert property values for an entity
 * Pass an object with property names as keys and values
 */
export const useUpsertPropertyValuesMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ entityType, entityId, values }) => {
      const res = await apiClient.put(
        canonicalEndpoints.propertyValues.upsert(entityType, entityId),
        { values }
      );
      return res.data;
    },
    onSuccess: (_, { entityType, entityId }) => {
      // Invalidate the property values cache for this entity
      queryClient.invalidateQueries({
        queryKey: ['propertyValues', tenantKey, entityType, entityId],
      });
    },
  });
};

// =============================================================================
// ENTITY DEFINITIONS API (Custom Objects)
// =============================================================================
// List, create, update, delete entity definitions (object types)
// System entities (pet, owner, booking, etc.) cannot be deleted
// =============================================================================

/**
 * List all entity definitions for the current tenant
 * Returns both system and custom entity types
 */
export const useEntityDefinitionsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const {
    includeInactive = false,
    includePropertyCount = true,
    systemOnly = false,
    customOnly = false,
  } = options;

  return useQuery({
    queryKey: ['entityDefinitions', tenantKey, { includeInactive, includePropertyCount, systemOnly, customOnly }],
    queryFn: async () => {
      const params = new URLSearchParams({
        includeInactive: includeInactive.toString(),
        includePropertyCount: includePropertyCount.toString(),
        systemOnly: systemOnly.toString(),
        customOnly: customOnly.toString(),
      });
      const res = await apiClient.get(`${canonicalEndpoints.entityDefinitions.list}?${params.toString()}`);
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Get a single entity definition by ID
 */
export const useEntityDefinitionQuery = (entityId, options = {}) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: ['entityDefinitions', tenantKey, entityId],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.entityDefinitions.detail(entityId));
      return res.data;
    },
    enabled: !!entityId,
    ...options,
  });
};

/**
 * Create a new custom entity definition
 */
export const useCreateEntityDefinitionMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (entityData) => {
      const res = await apiClient.post(canonicalEndpoints.entityDefinitions.create, entityData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entityDefinitions', tenantKey] });
    },
  });
};

/**
 * Update an entity definition
 */
export const useUpdateEntityDefinitionMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ entityId, ...entityData }) => {
      const res = await apiClient.patch(canonicalEndpoints.entityDefinitions.update(entityId), entityData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entityDefinitions', tenantKey] });
    },
  });
};

/**
 * Delete a custom entity definition (soft delete)
 * Will fail for system entities
 */
export const useDeleteEntityDefinitionMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (entityId) => {
      const res = await apiClient.delete(canonicalEndpoints.entityDefinitions.delete(entityId));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entityDefinitions', tenantKey] });
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


// Staff API - re-export from features/staff/api.js for backwards compatibility
// Prefer importing directly from '@/features/staff/api' in new code
export { useStaffQuery } from '@/features/staff/api';

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

// =============================================================================
// ENTERPRISE MEMBERSHIPS API
// =============================================================================
//
// Memberships represent staff/team members for the current tenant.
// This is the canonical interface for org management in BarkBase.
//
// Routes handled by config-service Lambda:
// - GET /api/v1/memberships - List all team members
// - POST /api/v1/memberships - Invite/create new member
// - PUT /api/v1/memberships/:id - Update member role/status
// - DELETE /api/v1/memberships/:id - Remove member from team
// =============================================================================

/**
 * Fetch all team members (memberships) for the current tenant.
 *
 * Response shape from config-service:
 * {
 *   success: true,
 *   data: [...],   // Array of membership objects
 *   members: [...], // Same array (for compatibility)
 *   total: number
 * }
 *
 * Each member object:
 * {
 *   id, membershipId, tenantId, userId, role, status,
 *   email, firstName, lastName, name,
 *   invitedAt, joinedAt, createdAt, updatedAt,
 *   isCurrentUser: boolean
 * }
 */
export const useMembersQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['members', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.memberships.list);
      const data = res.data;

      // Normalize response - backend returns both `data` and `members`
      const members = data?.data || data?.members || [];

      return {
        members,
        total: data?.total || members.length,
      };
    },
    enabled: isTenantReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Update a team member's role or status.
 *
 * Requires OWNER or ADMIN role. Only OWNER can modify OWNER/ADMIN memberships.
 */
export const useUpdateMemberRoleMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ membershipId, role, status }) => {
      const res = await apiClient.put(
        canonicalEndpoints.memberships.update(membershipId),
        { role, status }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', tenantKey] });
    },
  });
};

/**
 * Remove a team member from the tenant.
 *
 * Requires OWNER or ADMIN role. Only OWNER can remove OWNER/ADMIN members.
 * Users cannot remove themselves.
 */
export const useRemoveMemberMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (membershipId) => {
      const res = await apiClient.delete(
        canonicalEndpoints.memberships.delete(membershipId)
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', tenantKey] });
    },
  });
};

/**
 * Invite a new team member to the tenant.
 *
 * Creates a new user (if not exists) and membership record.
 * Requires OWNER or ADMIN role. Only OWNER can assign OWNER/ADMIN roles.
 *
 * Payload:
 * {
 *   email: string (required),
 *   role: 'OWNER' | 'ADMIN' | 'STAFF' | 'READONLY' (default: 'STAFF'),
 *   firstName?: string,
 *   lastName?: string
 * }
 */
export const useInviteMemberMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (inviteData) => {
      const res = await apiClient.post(canonicalEndpoints.memberships.create, inviteData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate members query to refetch with new member
      queryClient.invalidateQueries({ queryKey: ['members', tenantKey] });
    },
  });
};

// =============================================================================
// BILLING / SUBSCRIPTIONS API
// =============================================================================

const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

/**
 * Get current subscription/plan info for the tenant
 *
 * Backend response shape (from financial-service /api/v1/financial/subscriptions):
 * {
 *   data: { subscriptions: [...], currentPlan: {...} },
 *   subscriptions: [...],
 * }
 *
 * Each subscription/plan:
 * {
 *   id, tenantId, plan, planName, description, status,
 *   currentPeriodStart, currentPeriodEnd, createdAt,
 *   usage: { bookings: {used, limit}, activePets, storage: {used, limit}, seats: {used, limit} }
 * }
 */
export const useSubscriptionQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.subscriptions ? queryKeys.subscriptions(tenantKey) : [tenantKey, 'subscriptions'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.subscriptions.list);
        const data = res.data;

        // Normalize - backend returns data.currentPlan or data.subscriptions[0]
        const currentPlan = data?.data?.currentPlan || data?.data?.subscriptions?.[0] || data?.subscriptions?.[0] || null;
        console.log('[subscription] Fetched plan:', currentPlan?.plan);

        return {
          currentPlan,
          subscriptions: data?.data?.subscriptions || data?.subscriptions || [],
        };
      } catch (e) {
        console.warn('[subscription] Error fetching:', e?.message);
        return { currentPlan: null, subscriptions: [] };
      }
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData ?? { currentPlan: null, subscriptions: [] },
    ...options,
  });
};

/**
 * Get payment methods for the tenant
 *
 * Backend response shape (from financial-service /api/v1/financial/payment-methods):
 * {
 *   data: { methods: [...], paymentMethods: [...] },
 *   methods: [...],
 * }
 *
 * Each method:
 * {
 *   id, type, processor, last4, isPrimary, lastUsedAt, usageCount
 * }
 */
export const usePaymentMethodsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.paymentMethods ? queryKeys.paymentMethods(tenantKey) : [tenantKey, 'payment-methods'],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.paymentMethods.list);
        const data = res.data;

        // Normalize
        const methods = data?.data?.methods || data?.data?.paymentMethods || data?.methods || [];
        console.log('[payment-methods] Fetched:', methods.length);

        return {
          methods,
          primaryMethod: methods.find(m => m.isPrimary) || methods[0] || null,
        };
      } catch (e) {
        console.warn('[payment-methods] Error fetching:', e?.message);
        return { methods: [], primaryMethod: null };
      }
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData ?? { methods: [], primaryMethod: null },
    ...options,
  });
};

// =============================================================================
// PLATFORM BILLING INVOICES (BarkBase → Tenant)
// =============================================================================
//
// This is for invoices from BarkBase to the tenant (SaaS billing).
// Does NOT use the core operations Invoice table (booking_id, owner_id, etc).
//
// NOTE: This is DIFFERENT from "Business Invoices" which are invoices from
// the kennel business to their customers (pet owners). Those are handled
// in @/features/invoices/api.js (useBusinessInvoicesQuery).
// =============================================================================

/**
 * Fetch PLATFORM BILLING invoices (BarkBase billing the tenant)
 *
 * Used by: Settings → Billing → Invoices tab
 * NOT for: Finance → Invoices (that's business invoices to pet owners)
 *
 * TODO: Wire to Stripe/platform billing endpoint when backend is ready.
 * For now, returns empty array as placeholder.
 */
export const useTenantBillingInvoicesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [tenantKey, 'platform-billing-invoices'],
    queryFn: async () => {
      // TODO: When platform billing backend is ready, fetch from:
      // - Stripe API (invoices for this tenant's subscription)
      // - Or a dedicated BarkBase billing endpoint
      //
      // For now, return empty placeholder since we don't have
      // platform billing invoices implemented yet.
      console.log('[useTenantBillingInvoicesQuery] Platform billing invoices not yet implemented');

      return {
        invoices: [],
        total: 0,
        message: 'Platform billing invoices coming soon',
      };
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    placeholderData: { invoices: [], total: 0 },
    ...options,
  });
};