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
 * Get unread notification count
 */
export const useUnreadNotificationsCount = () => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(tenantKey),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/notifications/unread-count');
      return response.data?.unreadCount ?? 0;
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
    retry: 1,
    // Return 0 on error so UI doesn't break
    placeholderData: 0,
  });
};

/**
 * List notifications
 */
export const useNotifications = (options = {}) => {
  const tenantKey = useTenantKey();
  const { limit = 50, offset = 0, unreadOnly = false } = options;
  
  return useQuery({
    queryKey: queryKeys.notifications.list(tenantKey, { limit, offset, unreadOnly }),
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/notifications', {
        params: { limit, offset, unreadOnly: unreadOnly ? 'true' : 'false' }
      });
      return response.data;
    },
    staleTime: 30_000,
  });
};

/**
 * Mark notifications as read
 */
export const useMarkNotificationsRead = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (ids) => {
      const response = await apiClient.post('/api/v1/notifications/mark-read', { ids });
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
 * Mark all notifications as read
 */
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/v1/notifications/mark-all-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount(tenantKey) });
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'notifications', 'list'] });
    },
  });
};

