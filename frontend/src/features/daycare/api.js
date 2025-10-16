import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/**
 * Get all runs
 */
export const useRunsQuery = () => {
  return useQuery({
    queryKey: ['runs'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/runs');
      return response.data;
    }
  });
};

/**
 * Create a new run
 */
export const useCreateRunMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runData) => {
      const response = await apiClient.post('/api/v1/runs', runData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    }
  });
};

/**
 * Update a run
 */
export const useUpdateRunMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ runId, updates }) => {
      const response = await apiClient.put(`/api/v1/runs/${runId}`, updates);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    }
  });
};

/**
 * Delete a run
 */
export const useDeleteRunMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (runId) => {
      const response = await apiClient.delete(`/api/v1/runs/${runId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    }
  });
};

/**
 * Assign pets to a run
 */
export const useAssignPetsToRunMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ runId, petIds, date }) => {
      const response = await apiClient.put(`/api/v1/runs/${runId}/assign`, { petIds, date });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['runs'] });
    }
  });
};

/**
 * Get today's assignments
 */
export const useTodaysAssignmentsQuery = (date) => {
  return useQuery({
    queryKey: ['runs', 'today', date],
    queryFn: async () => {
      const params = date ? { date } : {};
      const response = await apiClient.get('/api/v1/runs/today', { params });
      return response.data;
    }
  });
};

/**
 * Remove pet from run
 */
export const useRemovePetFromRunMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ runId, petId, date }) => {
      const response = await apiClient.delete(`/api/v1/runs/${runId}/pets/${petId}`, {
        params: { date }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs', 'today'] });
    }
  });
};

