import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/**
 * Get today's tasks
 */
export const useTodaysTasksQuery = (filters = {}) => {
  return useQuery({
    queryKey: ['tasks', 'today', filters],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/tasks/today', { params: filters });
      return response.data;
    }
  });
};

/**
 * Get overdue tasks
 */
export const useOverdueTasksQuery = () => {
  return useQuery({
    queryKey: ['tasks', 'overdue'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/tasks/overdue');
      return response.data;
    }
  });
};

/**
 * Get tasks for a pet
 */
export const usePetTasksQuery = (petId, includeCompleted = false) => {
  return useQuery({
    queryKey: ['tasks', 'pet', petId, includeCompleted],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/tasks/pet/${petId}`, {
        params: { includeCompleted }
      });
      return response.data;
    },
    enabled: !!petId
  });
};

/**
 * Get tasks for a booking
 */
export const useBookingTasksQuery = (bookingId, includeCompleted = false) => {
  return useQuery({
    queryKey: ['tasks', 'booking', bookingId, includeCompleted],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/tasks/booking/${bookingId}`, {
        params: { includeCompleted }
      });
      return response.data;
    },
    enabled: !!bookingId
  });
};

/**
 * Create a task
 */
export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData) => {
      const response = await apiClient.post('/api/v1/tasks', taskData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

/**
 * Complete a task
 */
export const useCompleteTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, notes }) => {
      const response = await apiClient.put(`/api/v1/tasks/${taskId}/complete`, { notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

/**
 * Update a task
 */
export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, updates }) => {
      const response = await apiClient.put(`/api/v1/tasks/${taskId}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

/**
 * Delete a task
 */
export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId) => {
      const response = await apiClient.delete(`/api/v1/tasks/${taskId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });
};

