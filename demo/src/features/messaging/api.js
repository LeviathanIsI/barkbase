import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

/**
 * Get all conversations
 *
 * Backend returns: { data: [...], conversations: [...], total: N }
 * Each conversation: { id, subject, lastMessageAt, unreadCount, isArchived, owner, createdAt }
 */
export const useConversationsQuery = () => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['messages', 'conversations', tenantKey],
    enabled: isTenantReady,
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/messages/conversations');
      const data = response?.data;
      const conversations = data?.data || data?.conversations || (Array.isArray(data) ? data : []);
      // Normalize: backend returns 'id', frontend expects 'conversationId'
      return conversations.map(conv => ({
        ...conv,
        conversationId: conv.conversationId || conv.id,
        otherUser: conv.owner ? {
          name: `${conv.owner.firstName || ''} ${conv.owner.lastName || ''}`.trim() || 'Unknown',
          email: conv.owner.email,
        } : { name: 'Unknown' },
      }));
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Get messages in a conversation
 *
 * Backend returns: { data: [...], messages: [...], total: N }
 * Each message: { id, senderType, senderId, content, isRead, readAt, createdAt }
 */
export const useConversationMessagesQuery = (conversationId) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['messages', tenantKey, conversationId],
    enabled: isTenantReady && !!conversationId,
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/messages/${conversationId}`);
      const data = response?.data;
      const messages = data?.data || data?.messages || (Array.isArray(data) ? data : []);
      return messages;
    },
  });
};

/**
 * Send a message
 */
export const useSendMessageMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (messageData) => {
      const response = await apiClient.post('/api/v1/messages', messageData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['messages', tenantKey, data.conversationId] });
    }
  });
};

/**
 * Mark conversation as read
 */
export const useMarkConversationReadMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (conversationId) => {
      const response = await apiClient.put(`/api/v1/messages/${conversationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations', tenantKey] });
    }
  });
};

/**
 * Get unread count
 *
 * Backend returns: { count: N }
 */
export const useUnreadCountQuery = () => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['messages', 'unread', 'count', tenantKey],
    enabled: isTenantReady,
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/messages/unread/count');
      const count = response?.data?.count ?? 0;
      return count;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60000, // Refresh every 60 seconds
  });
};
