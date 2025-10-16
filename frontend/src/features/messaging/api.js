import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/**
 * Get all conversations
 */
export const useConversationsQuery = () => {
  return useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/messages/conversations');
      return response.data;
    }
  });
};

/**
 * Get messages in a conversation
 */
export const useConversationMessagesQuery = (conversationId) => {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/messages/${conversationId}`);
      return response.data;
    },
    enabled: !!conversationId
  });
};

/**
 * Send a message
 */
export const useSendMessageMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageData) => {
      const response = await apiClient.post('/api/v1/messages', messageData);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
    }
  });
};

/**
 * Mark conversation as read
 */
export const useMarkConversationReadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId) => {
      const response = await apiClient.put(`/api/v1/messages/${conversationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
    }
  });
};

/**
 * Get unread count
 */
export const useUnreadCountQuery = () => {
  return useQuery({
    queryKey: ['messages', 'unread', 'count'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/messages/unread/count');
      return response.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};

