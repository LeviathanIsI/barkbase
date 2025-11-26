import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { listQueryDefaults, detailQueryDefaults } from '@/lib/queryConfig';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

export const useTasksQuery = (filters = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.tasks(tenantKey, filters),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/tasks', { params: filters });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data ?? []);
      } catch (e) {
        console.warn('[tasks] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
    placeholderData: (previousData) => previousData,
  });
};

export const useTaskQuery = (taskId, options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.tasks(tenantKey, { id: taskId }),
    queryFn: async () => {
      try {
        const res = await apiClient.get(`/api/v1/tasks/${taskId}`);
        return res.data;
      } catch (e) {
        console.warn('[task] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled: !!taskId && (options.enabled !== false),
    ...detailQueryDefaults,
    placeholderData: (previousData) => previousData,
    ...options,
  });
};

// Convenience hooks expected by the Tasks route. Filter client-side for now.
export const useTodaysTasksQuery = () => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.tasks(tenantKey, { type: 'today' }),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/tasks');
        const tasks = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data ?? []);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = today.getMonth();
        const dd = today.getDate();
        return tasks.filter((t) => {
          if (!t.scheduledFor) return false;
          const d = new Date(t.scheduledFor);
          return d.getFullYear() === yyyy && d.getMonth() === mm && d.getDate() === dd;
        });
      } catch (e) {
        console.warn('[todaysTasks] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
    staleTime: 60 * 1000, // 1 minute for today's tasks
    placeholderData: (previousData) => previousData,
  });
};

export const useOverdueTasksQuery = () => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.tasks(tenantKey, { type: 'overdue' }),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/tasks');
        const tasks = Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data ?? []);
        const now = Date.now();
        return tasks.filter((t) => t.scheduledFor && !t.completedAt && new Date(t.scheduledFor).getTime() < now);
      } catch (e) {
        console.warn('[overdueTasks] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
};

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (taskData) => {
      const res = await apiClient.post('/api/v1/tasks', taskData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate all task-related queries
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'tasks'] });
    },
  });
};

export const useCompleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async ({ taskId, notes }) => {
      const res = await apiClient.post(`/api/v1/tasks/${taskId}/complete`, { notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'tasks'] });
    },
  });
};

export const useUpdateTaskMutation = (taskId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (updates) => {
      const res = await apiClient.put(`/api/v1/tasks/${taskId}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'tasks'] });
    },
  });
};

export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (taskId) => {
      await apiClient.delete(`/api/v1/tasks/${taskId}`);
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tenantKey, 'tasks'] });
    },
  });
};
