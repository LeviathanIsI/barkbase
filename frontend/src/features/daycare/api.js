import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Get all runs
 */
export const useRunsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  return useQuery({
    queryKey: queryKeys.runs(tenantKey, params),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/runs', { params });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data ?? []);
      } catch (e) {
        console.warn('[runs] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Create a new run
 */
export const useCreateRunMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (runData) => {
      const res = await apiClient.post('/api/v1/runs', runData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(tenantKey, {}) });
    }
  });
};

/**
 * Update a run
 */
export const useUpdateRunMutation = (runId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (updates) => {
      const res = await apiClient.put(`/api/v1/runs/${runId}`, updates);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(tenantKey, {}) });
    }
  });
};

/**
 * Delete a run
 */
export const useDeleteRunMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async (runId) => {
      await apiClient.delete(`/api/v1/runs/${runId}`);
      return runId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(tenantKey, {}) });
    }
  });
};

/**
 * Assign pets to a run with time slots
 * assignedPets is an array of {petId, startTime, endTime} objects
 */
export const useAssignPetsToRunMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ runId, assignedPets, date }) => {
      const res = await apiClient.put(`/api/v1/runs/${runId}`, { assignedPets });
      return res.data;
    },
    onSuccess: () => {
      // Don't invalidate - let the parent component handle refetch after all saves
    }
  });
};

/**
 * Get today's run assignments
 */
export const useTodaysAssignmentsQuery = (date) => {
  const tenantKey = useTenantKey();
  const dateStr = date || new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: queryKeys.runs(tenantKey, { date: dateStr, type: 'today' }),
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/runs/assignments', { params: { date: dateStr } });
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data ?? []);
      } catch (e) {
        console.warn('[todaysAssignments] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Remove pet from run
 * TODO: This requires a dedicated Lambda for complex removal logic
 */
export const useRemovePetFromRunMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ runId, petId, date }) => {
      const res = await apiClient.post(`/api/v1/runs/${runId}/remove-pet`, { petId, date });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(tenantKey, {}) });
    }
  });
};

