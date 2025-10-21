import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { from } from '@/lib/apiClient';
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
        const { data, error } = await from('runs').select('*').get();
        if (error) throw new Error(error.message);
        return Array.isArray(data) ? data : (data?.data ?? data ?? []);
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
      const { data, error } = await from('runs').insert(runData);
      if (error) throw new Error(error.message);
      return data;
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
      const { data, error } = await from('runs').update(updates).eq('id', runId);
      if (error) throw new Error(error.message);
      return data;
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
      const { error } = await from('runs').delete().eq('id', runId);
      if (error) throw new Error(error.message);
      return runId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(tenantKey, {}) });
    }
  });
};

/**
 * Assign pets to a run
 * TODO: This requires a dedicated Lambda for complex assignment logic
 */
export const useAssignPetsToRunMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ runId, petIds, date }) => {
      const { data, error } = await from('runs').customAction('assign', {
        id: runId,
        body: { petIds, date }
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(tenantKey, {}) });
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings(tenantKey, {}) });
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
        // For now, fetch all bookings for today with daycare service
        const { data, error } = await from('bookings')
          .select('*')
          .eq('checkIn', dateStr)
          .get();
        if (error) throw new Error(error.message);
        return Array.isArray(data) ? data : (data?.data ?? data ?? []);
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
      const { data, error } = await from('runs').customAction('remove-pet', {
        id: runId,
        body: { petId, date }
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs(tenantKey, {}) });
    }
  });
};

