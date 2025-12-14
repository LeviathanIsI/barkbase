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

/**
 * Hook to check if tenant context is ready for API calls
 * Must be defined before any hooks that use it (JavaScript const is not hoisted)
 */
const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

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


// Calendar API - capacity data for calendar views
export const useCalendarCapacity = (params = {}, options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [...queryKeys.calendar(tenantKey), 'capacity', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/analytics/capacity', { params });
      return response.data?.data || response.data || [];
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// Reports API

export const useReportsDashboardQuery = (params = {}, options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.reports.dashboard(tenantKey, params),
    queryFn: async () => {
      // Use the existing analytics dashboard endpoint which returns comprehensive data
      const response = await apiClient.get('/api/v1/analytics/dashboard');
      return response.data?.data || response.data || null;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// Bookings insights API - returns booking trends and patterns
export const useBookingsInsightsQuery = (params = {}, options = {}) => {
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [tenantKey, 'bookings-insights', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/analytics/bookings-insights', { params });
      return response.data?.data || response.data || null;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
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
    ...options,
  });
};

/**
 * Get detailed billing usage statistics
 *
 * Returns real counts from database for:
 * - Bookings this month
 * - Active pets
 * - Team seats
 * - Storage used
 * - Usage trends (last 6 months)
 * - Insights (average, busiest month, growth)
 */
export const useBillingUsageQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['billingUsage', tenantKey],
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.billing.usage);
        return res.data;
      } catch (e) {
        console.warn('[billing-usage] Error fetching:', e?.message);
        return {
          usage: {
            period: 'Current Month',
            resetDate: 'Next Month',
            bookings: { used: 0, limit: 150, percentage: 0 },
            activePets: { used: 0, limit: 100, percentage: 0 },
            storage: { used: 0, limit: 100, percentage: 0, details: { photos: 0, documents: 0 } },
            seats: { used: 0, limit: 2, percentage: 0 },
          },
          trends: [],
          insights: { avgBookings: 0, busiestMonth: { month: 'N/A', bookings: 0 }, growthPercent: 0 },
          plan: 'FREE',
        };
      }
    },
    enabled: isTenantReady,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Initiate plan upgrade
 */
export const useUpgradePlanMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ plan, billingCycle = 'monthly' }) => {
      const res = await apiClient.post(canonicalEndpoints.billing.upgrade, { plan, billingCycle });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billingUsage', tenantKey] });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions ? queryKeys.subscriptions(tenantKey) : [tenantKey, 'subscriptions'] });
    },
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
    ...options,
  });
};

// =============================================================================
// BILLING CONTACT
// =============================================================================

/**
 * Fetch billing contact information for the tenant
 */
export const useBillingContactQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: [tenantKey, 'billing-contact'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/financial/billing-contact');
        return {
          contact: res.data?.contact || res.data || null,
        };
      } catch (e) {
        console.warn('[billing-contact] Error fetching:', e?.message);
        return { contact: null };
      }
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
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
      return {
        invoices: [],
        total: 0,
        message: 'Platform billing invoices coming soon',
      };
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// =============================================================================
// NOTIFICATION SETTINGS API
// =============================================================================

/**
 * Fetch notification settings for the current tenant
 *
 * Response shape:
 * {
 *   success: true,
 *   settings: {
 *     emailEnabled, smsEnabled, pushEnabled,
 *     bookingConfirmations, bookingReminders, checkinReminders,
 *     vaccinationReminders, paymentReceipts, marketingEnabled,
 *     reminderDaysBefore, quietHoursStart, quietHoursEnd,
 *     useCustomTemplates, includePhotosInUpdates
 *   },
 *   isDefault: boolean
 * }
 */
export const useNotificationSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['notificationSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.notificationSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update notification settings for the current tenant
 */
export const useUpdateNotificationSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.notificationSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings', tenantKey] });
    },
  });
};

/**
 * Send a test notification (email or SMS)
 */
export const useSendTestNotificationMutation = () => {
  return useMutation({
    mutationFn: async ({ type, email, phone }) => {
      const res = await apiClient.post(canonicalEndpoints.notificationSettings.test, {
        type,
        email,
        phone,
      });
      return res.data;
    },
  });
};

// =============================================================================
// SMS SETTINGS API
// =============================================================================

/**
 * Fetch SMS/Twilio settings for the current tenant
 *
 * Response shape:
 * {
 *   success: true,
 *   settings: {
 *     isConnected, twilioAccountSid, twilioAuthToken (masked),
 *     twilioPhoneNumber, connectionVerifiedAt,
 *     bookingConfirmations, bookingReminders, checkinReminders,
 *     vaccinationReminders, paymentReceipts,
 *     messagesSentThisMonth, lastMessageSentAt
 *   },
 *   isDefault: boolean
 * }
 */
export const useSmsSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['smsSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.smsSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update SMS settings for the current tenant
 */
export const useUpdateSmsSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.smsSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsSettings', tenantKey] });
    },
  });
};

/**
 * Verify Twilio connection
 */
export const useVerifyTwilioMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(canonicalEndpoints.smsSettings.verify);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsSettings', tenantKey] });
    },
  });
};

/**
 * Disconnect Twilio
 */
export const useDisconnectTwilioMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(canonicalEndpoints.smsSettings.disconnect);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsSettings', tenantKey] });
    },
  });
};

/**
 * Send test SMS
 */
export const useSendTestSmsMutation = () => {
  return useMutation({
    mutationFn: async ({ phone }) => {
      const res = await apiClient.post(canonicalEndpoints.smsSettings.test, { phone });
      return res.data;
    },
  });
};

/**
 * Fetch SMS templates
 */
export const useSmsTemplatesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['smsTemplates', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.smsSettings.templates);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update an SMS template
 */
export const useUpdateSmsTemplateMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ type, content, name, isActive }) => {
      const res = await apiClient.put(
        canonicalEndpoints.smsSettings.template(type),
        { content, name, isActive }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smsTemplates', tenantKey] });
    },
  });
};

// =============================================================================
// EMAIL SETTINGS API
// =============================================================================

/**
 * Fetch email settings (branding, automation toggles)
 */
export const useEmailSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['emailSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.emailSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update email settings (branding, automation toggles)
 */
export const useUpdateEmailSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.emailSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailSettings', tenantKey] });
    },
  });
};

/**
 * Fetch email usage statistics
 */
export const useEmailUsageQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['emailUsage', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.emailSettings.usage);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 60 * 1000,
    ...options,
  });
};

/**
 * Fetch email templates
 */
export const useEmailTemplatesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['emailTemplates', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.emailSettings.templates);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update an email template
 */
export const useUpdateEmailTemplateMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ type, subject, body, name, isActive }) => {
      const res = await apiClient.put(
        canonicalEndpoints.emailSettings.template(type),
        { subject, body, name, isActive }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates', tenantKey] });
    },
  });
};

/**
 * Send a test email
 */
export const useSendTestEmailMutation = () => {
  return useMutation({
    mutationFn: async ({ templateType, recipientEmail }) => {
      const res = await apiClient.post(canonicalEndpoints.emailSettings.test, {
        templateType,
        recipientEmail,
      });
      return res.data;
    },
  });
};

// =============================================================================
// BOOKING SETTINGS API
// =============================================================================

/**
 * Fetch booking settings (rules, windows, operating hours)
 *
 * Response shape:
 * {
 *   success: true,
 *   settings: {
 *     onlineBookingEnabled, requireDeposit, depositPercentage,
 *     requireVaccinations, enableWaitlist,
 *     maxAdvanceDays, minAdvanceHours, cancellationWindowHours,
 *     checkinTime, checkoutTime, extendedHoursEnabled,
 *     earlyDropoffTime, latePickupTime, earlyDropoffFeeCents, latePickupFeeCents
 *   },
 *   isDefault: boolean
 * }
 */
export const useBookingSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['bookingSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.bookingSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update booking settings
 */
export const useUpdateBookingSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.bookingSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookingSettings', tenantKey] });
    },
  });
};

// =============================================================================
// CALENDAR SETTINGS API
// =============================================================================

/**
 * Fetch calendar settings (view, colors, display options, capacity)
 *
 * Response shape:
 * {
 *   success: true,
 *   settings: {
 *     defaultView, weekStartsOn, showWeekends, showCanceled, showCompleted,
 *     businessHoursStart, businessHoursEnd, greyOutNonWorking, showHoursIndicator,
 *     colorBy, statusColors, serviceColors,
 *     showPetName, showOwnerName, showServiceType, showPetPhoto, showTimes, showNotesPreview,
 *     timeSlotMinutes, showCapacityBar, capacityWarningThreshold, blockAtFullCapacity
 *   },
 *   isDefault: boolean
 * }
 */
export const useCalendarSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['calendarSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.calendarSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update calendar settings
 */
export const useUpdateCalendarSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.calendarSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarSettings', tenantKey] });
    },
  });
};

// =============================================================================
// ONLINE BOOKING SETTINGS API
// =============================================================================

/**
 * Fetch online booking settings (portal, services, new customers, requirements, confirmation, appearance)
 */
export const useOnlineBookingSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['onlineBookingSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.onlineBookingSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update online booking settings
 */
export const useUpdateOnlineBookingSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.onlineBookingSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onlineBookingSettings', tenantKey] });
    },
  });
};

/**
 * Check URL slug availability
 */
export const useCheckSlugAvailabilityMutation = () => {
  return useMutation({
    mutationFn: async (slug) => {
      const res = await apiClient.post(canonicalEndpoints.onlineBookingSettings.checkSlug, { slug });
      return res.data;
    },
  });
};

/**
 * Get portal QR code
 */
export const usePortalQRCodeQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['portalQRCode', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.onlineBookingSettings.qrCode);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// =============================================================================
// POLICIES API
// =============================================================================

/**
 * Fetch all policies (waivers, terms, etc.)
 */
export const usePoliciesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['policies', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.policies.list);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

// =============================================================================
// DOMAIN SETTINGS API
// =============================================================================

/**
 * Fetch domain settings (custom domain, SSL, verification status)
 */
export const useDomainSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['domainSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.domainSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update domain settings (custom domain)
 */
export const useUpdateDomainSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.domainSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domainSettings', tenantKey] });
    },
  });
};

/**
 * Verify custom domain
 */
export const useVerifyDomainMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(canonicalEndpoints.domainSettings.verify);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domainSettings', tenantKey] });
    },
  });
};

/**
 * Get domain verification status
 */
export const useDomainStatusQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['domainStatus', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.domainSettings.status);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 30 * 1000, // 30 seconds for status checks
    ...options,
  });
};

// =============================================================================
// PACKAGE TEMPLATES API
// =============================================================================
// Prepaid credit packages that facilities OFFER for purchase

/**
 * List all package templates
 */
export const usePackageTemplatesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: ['packageTemplates', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.packageTemplates.list);
      return res.data?.templates || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Create a package template
 */
export const useCreatePackageTemplateMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(canonicalEndpoints.packageTemplates.create, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packageTemplates', tenantKey] });
    },
  });
};

/**
 * Update a package template
 */
export const useUpdatePackageTemplateMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(canonicalEndpoints.packageTemplates.update(id), data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packageTemplates', tenantKey] });
    },
  });
};

/**
 * Delete (archive) a package template
 */
export const useDeletePackageTemplateMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(canonicalEndpoints.packageTemplates.delete(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packageTemplates', tenantKey] });
    },
  });
};

// =============================================================================
// ADD-ON SERVICES API
// =============================================================================
// Optional extras customers can add to bookings

/**
 * List all add-on services
 */
export const useAddOnServicesQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: ['addonServices', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.addonServices.list);
      return res.data?.addons || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Create an add-on service
 */
export const useCreateAddOnServiceMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(canonicalEndpoints.addonServices.create, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addonServices', tenantKey] });
    },
  });
};

/**
 * Update an add-on service
 */
export const useUpdateAddOnServiceMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(canonicalEndpoints.addonServices.update(id), data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addonServices', tenantKey] });
    },
  });
};

/**
 * Delete (archive) an add-on service
 */
export const useDeleteAddOnServiceMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(canonicalEndpoints.addonServices.delete(id));
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addonServices', tenantKey] });
    },
  });
};

// =============================================================================
// INVOICE SETTINGS API
// =============================================================================

/**
 * Fetch invoice settings (defaults, tax, branding, late fees, automation)
 */
export const useInvoiceSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['invoiceSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.invoiceSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update invoice settings
 */
export const useUpdateInvoiceSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.invoiceSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceSettings', tenantKey] });
    },
  });
};

/**
 * Get invoice preview with sample data
 */
export const useInvoicePreviewQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['invoicePreview', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.invoiceSettings.preview);
      return res.data;
    },
    enabled: isTenantReady && (options.enabled !== false),
    staleTime: 0, // Always fetch fresh preview
    ...options,
  });
};

// =============================================================================
// PAYMENT SETTINGS API
// =============================================================================

/**
 * Fetch payment settings (Stripe connection, accepted methods, processing config)
 *
 * Response shape:
 * {
 *   success: true,
 *   settings: {
 *     stripeConnected, stripeAccountId, stripePublishableKey, stripeSecretKeyMasked,
 *     stripeTestMode, stripeWebhookStatus, stripeLastWebhookAt,
 *     acceptCards, acceptAch, acceptCash, acceptCheck,
 *     processingFeePercent, transactionFeeCents,
 *     saveCustomerCards, autoChargeOnCheckin, autoChargeOnCheckout,
 *     emailReceipts, requireDeposit, depositPercentage
 *   },
 *   isDefault: boolean
 * }
 */
export const usePaymentSettingsQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['paymentSettings', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.paymentSettings.get);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

/**
 * Update payment settings
 */
export const useUpdatePaymentSettingsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (settings) => {
      const res = await apiClient.put(canonicalEndpoints.paymentSettings.update, settings);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentSettings', tenantKey] });
    },
  });
};

/**
 * Test Stripe connection with provided credentials
 */
export const useTestStripeConnectionMutation = () => {
  return useMutation({
    mutationFn: async ({ publishableKey, secretKey }) => {
      const res = await apiClient.post(canonicalEndpoints.paymentSettings.testStripe, {
        publishableKey,
        secretKey,
      });
      return res.data;
    },
  });
};

/**
 * Get current Stripe connection status
 */
export const useStripeStatusQuery = (options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['stripeStatus', tenantKey],
    queryFn: async () => {
      const res = await apiClient.get(canonicalEndpoints.paymentSettings.stripeStatus);
      return res.data;
    },
    enabled: isTenantReady,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
};

/**
 * Disconnect Stripe (remove credentials)
 */
export const useDisconnectStripeMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(canonicalEndpoints.paymentSettings.disconnectStripe);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentSettings', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['stripeStatus', tenantKey] });
    },
  });
};

// =============================================================================
// MULTI-PROCESSOR PAYMENT SETTINGS API
// =============================================================================

/**
 * Test Square connection with provided credentials
 * Validates by calling Square's Locations API
 */
export const useTestSquareConnectionMutation = () => {
  return useMutation({
    mutationFn: async ({ applicationId, accessToken, locationId, environment = 'sandbox' }) => {
      const res = await apiClient.post(canonicalEndpoints.paymentSettings.testSquare, {
        applicationId,
        accessToken,
        locationId,
        environment,
      });
      return res.data;
    },
  });
};

/**
 * Test PayPal connection with provided credentials
 * Validates by getting an OAuth access token
 */
export const useTestPayPalConnectionMutation = () => {
  return useMutation({
    mutationFn: async ({ clientId, clientSecret, environment = 'sandbox' }) => {
      const res = await apiClient.post(canonicalEndpoints.paymentSettings.testPaypal, {
        clientId,
        clientSecret,
        environment,
      });
      return res.data;
    },
  });
};

/**
 * Generic test connection mutation - routes to appropriate processor
 */
export const useTestPaymentConnectionMutation = () => {
  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(canonicalEndpoints.paymentSettings.test, data);
      return res.data;
    },
  });
};

/**
 * Disconnect current payment processor (removes all credentials)
 */
export const useDisconnectPaymentProcessorMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(canonicalEndpoints.paymentSettings.disconnect);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentSettings', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['stripeStatus', tenantKey] });
    },
  });
};