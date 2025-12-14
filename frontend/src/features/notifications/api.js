/**
 * Notifications API
 * Provides hooks for fetching and managing notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Get unread notification count (lightweight endpoint)
 */
export const useUnreadNotificationsCount = () => {
  const tenantKey = useTenantKey();

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(tenantKey),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/operations/notifications/count');
      return response.data?.unreadCount ?? 0;
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
    retry: 1,
    // Return 0 on error so UI doesn't break
  });
};

/**
 * List notifications
 */
export const useNotifications = (options = {}) => {
  const tenantKey = useTenantKey();
  const { limit = 50, offset = 0, unreadOnly = false, enabled = true } = options;

  return useQuery({
    queryKey: queryKeys.notifications.list(tenantKey, { limit, offset, unreadOnly }),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/operations/notifications', {
        params: { limit, offset, unreadOnly: unreadOnly ? 'true' : 'false' }
      });
      return {
        notifications: response.data?.notifications || response.data?.data || [],
        unreadCount: response.data?.unreadCount ?? 0,
        total: response.data?.total ?? 0,
      };
    },
    staleTime: 30_000,
    enabled,
  });
};

/**
 * Mark a single notification as read
 */
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.patch(`/api/v1/operations/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate unread count and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(tenantKey) });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'notifications', 'list'] });
    },
  });
};

/**
 * Mark multiple notifications as read (batch)
 */
export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (ids) => {
      // Mark each notification as read (could be optimized to batch endpoint later)
      await Promise.all(
        ids.map(id => apiClient.patch(`/api/v1/operations/notifications/${id}/read`))
      );
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(tenantKey) });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'notifications', 'list'] });
    },
  });
};

/**
 * Mark all notifications as read
 */
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch('/api/v1/operations/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(tenantKey) });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'notifications', 'list'] });
    },
  });
};
