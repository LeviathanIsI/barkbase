import apiClient from '@/lib/apiClient';
import { detailQueryDefaults, listQueryDefaults } from '@/lib/queryConfig';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useCommunicationsQuery = (ownerId) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.communications?.(tenantKey, ownerId) ?? ['communications', tenantKey, ownerId],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/communications', { params: { ownerId } });
        return res.data;
      } catch (e) {
        console.warn('[communications] Falling back to empty list:', e?.message || e);
        return [];
      }
    },
    enabled: !!ownerId,
    ...listQueryDefaults,
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
        queryClient.invalidateQueries({ queryKey: ['communications', tenantKey, data.ownerId] });
        queryClient.invalidateQueries({ queryKey: ['timeline', data.ownerId] });
        queryClient.invalidateQueries({ queryKey: ['communication-stats', data.ownerId] });
      }
    },
  });
};

export const useCustomerTimeline = (ownerId) => {
  return useInfiniteQuery({
    queryKey: ['timeline', ownerId],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const res = await apiClient.get(`/api/v1/entity/communications/owner/${ownerId}/timeline`, {
          params: { offset: pageParam, limit: 50 },
        });
        return res.data || { items: [], total: 0, offset: pageParam, limit: 50 };
      } catch (e) {
        console.warn('[timeline] Error:', e?.message || e);
        return { items: [], total: 0, offset: pageParam, limit: 50 };
      }
    },
    getNextPageParam: (lastPage) => {
      const { offset = 0, limit = 50, total = 0 } = lastPage;
      const nextOffset = offset + limit;
      return nextOffset < total ? nextOffset : undefined;
    },
    enabled: !!ownerId,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });
};

export const useCommunicationStats = (ownerId) => {
  return useQuery({
    queryKey: ['communication-stats', ownerId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/api/v1/entity/communications/owner/${ownerId}/stats`);
        return res.data || { total: 0, emails: 0, sms: 0, phone: 0, notes: 0 };
      } catch (e) {
        console.warn('[communication-stats] Error:', e?.message || e);
        return { total: 0, emails: 0, sms: 0, phone: 0, notes: 0 };
      }
    },
    enabled: !!ownerId,
    ...detailQueryDefaults,
  });
};

// Communication mutations
export const useCreateCommunication = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post('/api/v1/communications', data);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.ownerId) {
        queryClient.invalidateQueries({ queryKey: ['communications', data.ownerId] });
        queryClient.invalidateQueries({ queryKey: ['timeline', data.ownerId] });
        queryClient.invalidateQueries({ queryKey: ['communication-stats', data.ownerId] });
      }
    },
  });
};

// Note queries
export const useEntityNotes = (entityType, entityId, options = {}) => {
  return useQuery({
    queryKey: ['notes', entityType, entityId],
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/api/v1/notes/${entityType}/${entityId}`, { params: options });
        return res.data || [];
      } catch (e) {
        console.warn('[notes] Error:', e?.message || e);
        return [];
      }
    },
    enabled: !!entityType && !!entityId,
    ...listQueryDefaults,
  });
};

export const useNoteCategories = () => {
  return useQuery({
    queryKey: ['note-categories'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/notes/categories');
        return res.data || [];
      } catch (e) {
        console.warn('[note-categories] Error:', e?.message || e);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000, // Categories rarely change
    refetchOnWindowFocus: false,
  });
};

/**
 * Add a new note category
 *
 * Fetches current categories, adds the new one, and updates the array.
 * Returns the new option in { value, label } format for immediate use.
 */
export const useAddNoteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCategory) => {
      // Get current categories from cache or fetch
      const currentCategories = queryClient.getQueryData(['note-categories']) || [];

      // Check if category already exists (case-insensitive)
      const exists = currentCategories.some(
        c => c.toLowerCase() === newCategory.toLowerCase()
      );
      if (exists) {
        throw new Error(`Category "${newCategory}" already exists`);
      }

      // Add new category and update via API
      const updatedCategories = [...currentCategories, newCategory];
      await apiClient.put('/api/v1/notes/categories', { categories: updatedCategories });

      // Return the new option for immediate selection
      return { value: newCategory, label: newCategory };
    },
    onSuccess: (_, newCategory) => {
      // Update the cache with the new category
      queryClient.setQueryData(['note-categories'], (oldCategories = []) => {
        if (oldCategories.includes(newCategory)) return oldCategories;
        return [...oldCategories, newCategory];
      });
    },
    onError: (error) => {
      console.error('[note-categories] Add failed:', error?.message);
    },
  });
};

// Note mutations
export const useCreateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post('/api/v1/notes', data);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.entityType && data?.entityId) {
        queryClient.invalidateQueries({ queryKey: ['notes', data.entityType, data.entityId] });
        if (data.entityType === 'owner') {
          queryClient.invalidateQueries({ queryKey: ['timeline', data.entityId] });
        }
      }
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ noteId, ...data }) => {
      const res = await apiClient.put(`/api/v1/notes/${noteId}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.entityType && data?.entityId) {
        queryClient.invalidateQueries({ queryKey: ['notes', data.entityType, data.entityId] });
      }
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (noteId) => {
      await apiClient.delete(`/api/v1/notes/${noteId}`);
      return noteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
  });
};

export const useToggleNotePin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (noteId) => {
      const res = await apiClient.post(`/api/v1/notes/${noteId}/pin`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.entityType && data?.entityId) {
        queryClient.invalidateQueries({ queryKey: ['notes', data.entityType, data.entityId] });
      }
    },
  });
};

// Segment queries
export const useSegments = (options = {}) => {
  return useQuery({
    queryKey: ['segments'],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/segments', { params: options });
      // Backend returns { data: [...], segments: [...], total: N }
      const data = res.data?.data || res.data?.segments || res.data || [];
      return Array.isArray(data) ? data : [];
    },
    ...listQueryDefaults,
  });
};

export const useSegmentMembers = (segmentId, options = {}) => {
  return useInfiniteQuery({
    queryKey: ['segment-members', segmentId],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const res = await apiClient.get(`/api/v1/segments/${segmentId}/members`, {
          params: { ...options, offset: pageParam, limit: 50 },
        });
        const data = res.data?.data || res.data || [];
        const hasMore = res.data?.hasMore ?? false;
        return { data, hasMore, offset: pageParam, limit: 50 };
      } catch (e) {
        console.warn('[segment-members] Error:', e?.message || e);
        return { data: [], hasMore: false, offset: pageParam, limit: 50 };
      }
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.offset + lastPage.limit;
    },
    enabled: !!segmentId,
    refetchOnWindowFocus: false,
  });
};

// Segment mutations
export const useCreateSegment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post('/api/v1/segments', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

export const useUpdateSegment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ segmentId, ...data }) => {
      const res = await apiClient.put(`/api/v1/segments/${segmentId}`, data);
      return res.data;
    },
    onSuccess: (_, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segment-members', segmentId] });
    },
  });
};

export const useAddSegmentMembers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ segmentId, ownerIds }) => {
      const res = await apiClient.post(`/api/v1/segments/${segmentId}/members`, { ownerIds });
      return res.data;
    },
    onSuccess: (_, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['segment-members', segmentId] });
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

export const useRemoveSegmentMembers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ segmentId, ownerIds }) => {
      await apiClient.delete(`/api/v1/segments/${segmentId}/members`, { data: { ownerIds } });
    },
    onSuccess: (_, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['segment-members', segmentId] });
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

export const useDeleteSegment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (segmentId) => {
      await apiClient.delete(`/api/v1/segments/${segmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

export const useRefreshSegments = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/segments/refresh');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segment-members'] });
    },
  });
};
