import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/lib/apiClient';

// TODO: The queries in this file fetch tasks by custom filters like 'today' or 'overdue'.
// This requires dedicated Lambda functions or more advanced filtering capabilities in the ApiClient.
// For now, we will provide a basic CRUD implementation for the 'tasks' table.

export const useTasksQuery = (filters = {}) => {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = from('tasks').select('*');
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          query = query.eq(key, value);
        }
      });
      const { data, error } = await query.get();
      if (error) throw new Error(error.message);
      return data;
    },
    // Allow fetching all tasks when no specific filters are provided
    enabled: true,
  });
};

// Convenience hooks expected by the Tasks route. We fetch tasks and filter client-side
// until dedicated API endpoints are available.
export const useTodaysTasksQuery = () => {
  return useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      const { data, error } = await from('tasks').select('*').get();
      if (error) throw new Error(error.message);
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = today.getMonth();
      const dd = today.getDate();
      return (data || []).filter((t) => {
        if (!t.scheduledFor) return false;
        const d = new Date(t.scheduledFor);
        return d.getFullYear() === yyyy && d.getMonth() === mm && d.getDate() === dd;
      });
    },
  });
};

export const useOverdueTasksQuery = () => {
  return useQuery({
    queryKey: ['tasks', 'overdue'],
    queryFn: async () => {
      const { data, error } = await from('tasks').select('*').get();
      if (error) throw new Error(error.message);
      const now = Date.now();
      return (data || []).filter((t) => t.scheduledFor && !t.completedAt && new Date(t.scheduledFor).getTime() < now);
    },
  });
};


export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskData) => {
      const { data, error } = await from('tasks').insert(taskData);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

// TODO: This requires a custom Lambda to handle the logic of completing a task.
export const useCompleteTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, notes }) => {
      console.warn('Complete task mutation not implemented yet.');
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, updates }) => {
      const { data, error } = await from('tasks').update(updates).eq('id', taskId);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      const { error } = await from('tasks').delete().eq('id', taskId);
      if (error) throw new Error(error.message);
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

