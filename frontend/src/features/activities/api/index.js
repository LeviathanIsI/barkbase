/**
 * Activities API Hooks
 * React Query hooks for managing activity logs (notes, calls, emails, SMS)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';

// Local tenant key hook
const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

const ACTIVITIES_BASE = '/api/v1/entity/activities';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const activityKeys = {
  all: (tenantKey) => ['activities', tenantKey],
  list: (tenantKey, entityType, entityId, filters) =>
    ['activities', tenantKey, entityType, entityId, filters],
  detail: (tenantKey, id) => ['activities', tenantKey, 'detail', id],
};

// ============================================================================
// GET ACTIVITIES
// ============================================================================

/**
 * Fetch activities for an entity
 * @param {string} entityType - 'owner', 'pet', 'booking', 'invoice'
 * @param {string} entityId - UUID of the entity
 * @param {object} options - { activityType, page, limit }
 */
export const useActivities = (entityType, entityId, options = {}) => {
  const tenantKey = useTenantKey();
  const { activityType, page = 1, limit = 50 } = options;

  return useQuery({
    queryKey: activityKeys.list(tenantKey, entityType, entityId, { activityType, page, limit }),
    queryFn: async () => {
      const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
        page: String(page),
        limit: String(limit),
      });

      if (activityType) {
        params.set('activity_type', activityType);
      }

      const res = await apiClient.get(`${ACTIVITIES_BASE}?${params.toString()}`);
      return res.data;
    },
    enabled: !!entityType && !!entityId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Fetch a single activity by ID
 */
export const useActivity = (activityId) => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: activityKeys.detail(tenantKey, activityId),
    queryFn: async () => {
      const res = await apiClient.get(`${ACTIVITIES_BASE}/${activityId}`);
      return res.data;
    },
    enabled: !!activityId,
  });
};

// ============================================================================
// CREATE ACTIVITY
// ============================================================================

/**
 * Create a new activity
 */
export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(ACTIVITIES_BASE, data);
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate the activities list for this entity
      queryClient.invalidateQueries({
        queryKey: ['activities', tenantKey, data.entityType, data.entityId],
      });
    },
  });
};

// ============================================================================
// UPDATE ACTIVITY
// ============================================================================

/**
 * Update an existing activity
 */
export const useUpdateActivity = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await apiClient.put(`${ACTIVITIES_BASE}/${id}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      // Invalidate both the list and detail
      queryClient.invalidateQueries({
        queryKey: ['activities', tenantKey, data.entityType, data.entityId],
      });
      queryClient.invalidateQueries({
        queryKey: activityKeys.detail(tenantKey, data.id),
      });
    },
  });
};

// ============================================================================
// DELETE ACTIVITY
// ============================================================================

/**
 * Delete an activity
 */
export const useDeleteActivity = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ id, entityType, entityId }) => {
      const res = await apiClient.delete(`${ACTIVITIES_BASE}/${id}`);
      return { ...res.data, entityType, entityId };
    },
    onSuccess: (data) => {
      // Invalidate the activities list for this entity
      queryClient.invalidateQueries({
        queryKey: ['activities', tenantKey, data.entityType, data.entityId],
      });
    },
  });
};

// ============================================================================
// TOGGLE PIN
// ============================================================================

/**
 * Toggle pin status on an activity
 */
export const useToggleActivityPin = () => {
  const updateMutation = useUpdateActivity();

  return useMutation({
    mutationFn: async ({ id, isPinned, entityType, entityId }) => {
      return updateMutation.mutateAsync({ id, isPinned: !isPinned, entityType, entityId });
    },
  });
};
