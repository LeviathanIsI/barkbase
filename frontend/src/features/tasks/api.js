import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

// TODO: The queries in this file fetch tasks by custom filters like 'today' or 'overdue'.
// This requires dedicated Lambda functions or more advanced filtering capabilities in the ApiClient.
// For now, we will provide a basic CRUD implementation for the 'tasks' table.

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
    staleTime: 30 * 1000,
  });
};

// Convenience hooks expected by the Tasks route. We fetch tasks and filter client-side
// until dedicated API endpoints are available.
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
    staleTime: 60 * 1000,
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
    staleTime: 60 * 1000,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(tenantKey, {}) });
    }
  });
};

// TODO: This requires a custom Lambda to handle the logic of completing a task.
export const useCompleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  return useMutation({
    mutationFn: async ({ taskId, notes }) => {
      const res = await apiClient.post(`/api/v1/tasks/${taskId}/complete`, { notes });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(tenantKey, {}) });
    }
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(tenantKey, {}) });
    }
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
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(tenantKey, {}) });
    }
  });
};

