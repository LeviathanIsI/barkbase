import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useCommunicationsQuery = (ownerId) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.communications(tenantKey, ownerId),
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/communications', { params: { ownerId } });
      return res.data;
    },
    enabled: !!ownerId,
  });
};

export const useCreateCommunicationMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post('/api/v1/communications', payload);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.ownerId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.communications(tenantKey, data.ownerId) });
      }
    },
  });
};

export const useCustomerTimeline = (ownerId) => {
  return useInfiniteQuery({
    queryKey: ['timeline', ownerId],
    queryFn: ({ pageParam = 0 }) =>
      apiClient.get(`/api/v1/communications/owner/${ownerId}/timeline`, {
        params: {
          offset: pageParam,
          limit: 50,
        },
      }),
    getNextPageParam: (lastPage) => {
      const { offset, limit, total } = lastPage;
      const nextOffset = offset + limit;
      return nextOffset < total ? nextOffset : undefined;
    },
    enabled: !!ownerId,
  });
};

export const useCommunicationStats = (ownerId) => {
  return useQuery({
    queryKey: ['communication-stats', ownerId],
    queryFn: () => apiClient.get(`/api/v1/communications/owner/${ownerId}/stats`),
    enabled: !!ownerId,
  });
};

// Communication mutations
export const useCreateCommunication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiClient.post('/api/v1/communications', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communications', data.ownerId] });
      queryClient.invalidateQueries({ queryKey: ['timeline', data.ownerId] });
      queryClient.invalidateQueries({ queryKey: ['communication-stats', data.ownerId] });
    },
  });
};

// Note queries
export const useEntityNotes = (entityType, entityId, options = {}) => {
  return useQuery({
    queryKey: ['notes', entityType, entityId, options],
    queryFn: () =>
      apiClient.get(`/api/v1/notes/${entityType}/${entityId}`, {
        params: options,
      }),
    enabled: !!entityType && !!entityId,
  });
};

export const useNoteCategories = () => {
  return useQuery({
    queryKey: ['note-categories'],
    queryFn: () => apiClient.get('/api/v1/notes/categories'),
  });
};

// Note mutations
export const useCreateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiClient.post('/api/v1/notes', data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['notes', data.entityType, data.entityId] 
      });
      if (data.entityType === 'owner') {
        queryClient.invalidateQueries({ queryKey: ['timeline', data.entityId] });
      }
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ noteId, ...data }) => 
      apiClient.put(`/api/v1/notes/${noteId}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['notes', data.entityType, data.entityId] 
      });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (noteId) => apiClient.delete(`/api/v1/notes/${noteId}`),
    onSuccess: (_, noteId) => {
      // Invalidate all note queries since we don't know the entity
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};

export const useToggleNotePin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (noteId) => apiClient.post(`/api/v1/notes/${noteId}/pin`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['notes', data.entityType, data.entityId] 
      });
    },
  });
};

// Segment queries
export const useSegments = (options = {}) => {
  return useQuery({
    queryKey: ['segments', options],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/segments', { params: options });
      return res.data || [];
    },
  });
};

export const useSegmentMembers = (segmentId, options = {}) => {
  return useInfiniteQuery({
    queryKey: ['segment-members', segmentId, options],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiClient.get(`/api/v1/segments/${segmentId}/members`, {
        params: {
          ...options,
          offset: pageParam,
          limit: 50,
        },
      });
      // Normalize response - backend returns { data: [], hasMore } or just array
      const data = res.data?.data || res.data || [];
      const hasMore = res.data?.hasMore ?? false;
      return { data, hasMore, offset: pageParam, limit: 50 };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.offset + lastPage.limit;
    },
    enabled: !!segmentId,
  });
};

// Segment mutations
export const useCreateSegment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => apiClient.post('/api/v1/segments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

export const useUpdateSegment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ segmentId, ...data }) => 
      apiClient.put(`/api/v1/segments/${segmentId}`, data),
    onSuccess: (_, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segment-members', segmentId] });
    },
  });
};

export const useAddSegmentMembers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ segmentId, ownerIds }) => 
      apiClient.post(`/api/v1/segments/${segmentId}/members`, { ownerIds }),
    onSuccess: (_, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['segment-members', segmentId] });
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

export const useRemoveSegmentMembers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ segmentId, ownerIds }) => 
      apiClient.delete(`/api/v1/segments/${segmentId}/members`, { 
        data: { ownerIds } 
      }),
    onSuccess: (_, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['segment-members', segmentId] });
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

export const useDeleteSegment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (segmentId) => apiClient.delete(`/api/v1/segments/${segmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

export const useRefreshSegments = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.post('/api/v1/segments/refresh'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segment-members'] });
    },
  });
};

