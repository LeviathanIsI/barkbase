import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

/**
 * Get all runs (physical locations in the facility)
 *
 * Backend returns: { data: [...], runs: [...], total: N }
 * Each run (NEW schema): {
 *   id, templateId, facilityId, name, code, size, species,
 *   sortOrder, isActive, maxCapacity, timePeriodMinutes, assignmentCount
 * }
 */
export const useRunsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.runs(tenantKey, params),
    enabled: isTenantReady,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/runs', { params });
      const data = res.data?.data || res.data?.runs || (Array.isArray(res.data) ? res.data : []);

      // Map to expected format with recordId for consistency
      return data.map(run => ({
        ...run,
        recordId: run.id,
        capacity: run.maxCapacity || 10,  // Alias for backward compatibility
      }));
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
 * Save all run assignments for a date
 * POST /api/v1/runs/assignments
 * Payload: { date, assignments: [{ runId, petId, startTime, endTime, bookingId?, notes? }] }
 */
export const useSaveRunAssignmentsMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ date, assignments }) => {
      const res = await apiClient.post('/api/v1/runs/assignments', {
        date,
        assignments,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate run assignments for the date
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs(tenantKey, { date: variables.date, type: 'today' })
      });
    },
  });
};

/**
 * Assign pets to a specific run
 * POST /api/v1/runs/:runId/assignments
 * Payload: { date, petIds, startTime?, endTime?, bookingIds? }
 */
export const useAssignPetsToRunMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ runId, petIds, date, startTime, endTime, bookingIds }) => {
      const res = await apiClient.post(`/api/v1/runs/${runId}/assignments`, {
        date,
        petIds,
        startTime,
        endTime,
        bookingIds,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs(tenantKey, { date: variables.date, type: 'today' })
      });
      // Also invalidate bookings so modal can show updated run assignment
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

/**
 * Remove pet(s) from a run
 * DELETE /api/v1/runs/:runId/assignments
 * Body: { date?, petIds?, assignmentIds? }
 */
export const useRemovePetFromRunMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ runId, petIds, date, assignmentIds }) => {
      const res = await apiClient.delete(`/api/v1/runs/${runId}/assignments`, {
        data: { date, petIds, assignmentIds },
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate both 'today' and 'assignments' query types
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs(tenantKey, { date: variables.date, type: 'today' })
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs(tenantKey, { type: 'assignments' })
      });
      // Also invalidate without specific params to catch all runs queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs(tenantKey, {})
      });
    },
  });
};

/**
 * Update a single run assignment
 * PUT /api/v1/runs/assignments/:assignmentId
 * Body: { startTime, endTime, runId?, notes? }
 */
export const useUpdateRunAssignmentMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();

  return useMutation({
    mutationFn: async ({ assignmentId, startTime, endTime, runId, notes, date }) => {
      const res = await apiClient.put(`/api/v1/runs/assignments/${assignmentId}`, {
        startTime,
        endTime,
        runId,
        notes,
      });
      return { ...res.data, date };
    },
    onSuccess: (data) => {
      // Invalidate today's assignments to refresh the grid
      const date = data.date || new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({
        queryKey: queryKeys.runs(tenantKey, { date, type: 'today' })
      });
      // Also invalidate bookings so modal can show updated run assignment
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

/**
 * Get run assignments for a date (or date range)
 *
 * Backend returns: {
 *   data: [...],       // Flat list of assignments
 *   assignments: [...],
 *   runs: [...],       // List of active runs
 *   startDate, endDate, total
 * }
 *
 * Each assignment: {
 *   id, runId, runName, bookingId, petId, petName, petSpecies, petBreed, petPhotoUrl,
 *   ownerName, startAt, endAt, startTime, endTime, status, notes
 * }
 *
 * This hook transforms the flat assignments into runs-with-nested-assignments format
 * that the RunAssignment.jsx component expects.
 */
export const useTodaysAssignmentsQuery = (date) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();
  const dateStr = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: queryKeys.runs(tenantKey, { date: dateStr, type: 'today' }),
    enabled: isTenantReady,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/runs/assignments', { params: { date: dateStr } });
      const assignments = res.data?.data || res.data?.assignments || [];
      const runsFromApi = res.data?.runs || [];

      // Transform flat assignments into runs with nested assignments
      // The frontend expects: runs[].assignments = [{pet: {...}, startTime, endTime}]
      const runMap = new Map();

      // First, create entries for all runs from the API
      runsFromApi.forEach(run => {
        runMap.set(run.id, {
          recordId: run.id,
          id: run.id,
          name: run.name,
          code: run.code,
          size: run.size,
          species: run.species,
          sortOrder: run.sortOrder,
          maxCapacity: run.maxCapacity || 10,
          templateName: run.templateName,
          assignments: [],
        });
      });

      // Then add assignments to their respective runs
      assignments.forEach(assignment => {
        const runId = assignment.runId;
        if (!runMap.has(runId)) {
          // Create run entry if not from runs list
          runMap.set(runId, {
            recordId: runId,
            id: runId,
            name: assignment.runName || 'Unknown Run',
            code: assignment.runCode,
            size: assignment.runSize,
            species: assignment.runSpecies,
            sortOrder: assignment.runSortOrder || 0,
            maxCapacity: assignment.maxCapacity || 10,
            templateName: assignment.templateName,
            assignments: [],
          });
        }

        // Add assignment with pet info nested
        const run = runMap.get(runId);
        run.assignments.push({
          id: assignment.id,
          bookingId: assignment.bookingId,
          startTime: assignment.startTime || assignment.startAt,
          endTime: assignment.endTime || assignment.endAt,
          startAt: assignment.startAt,
          endAt: assignment.endAt,
          status: assignment.status,
          notes: assignment.notes,
          pet: {
            recordId: assignment.petId,
            id: assignment.petId,
            name: assignment.petName || 'Unknown Pet',
            species: assignment.petSpecies,
            breed: assignment.petBreed,
            photoUrl: assignment.petPhotoUrl,
          },
        });
      });

      // Convert map to sorted array
      const runs = Array.from(runMap.values())
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));

      return runs;
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Get run assignments for a date range (for weekly grid views)
 *
 * Returns flat assignments with run info for calendar/grid views
 */
export const useRunAssignmentsQuery = (params = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.runs(tenantKey, { ...params, type: 'assignments' }),
    enabled: isTenantReady,
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/runs/assignments', { params });
      const data = res.data || {};

      return {
        assignments: data.data || data.assignments || [],
        runs: data.runs || [],
        startDate: data.startDate,
        endDate: data.endDate,
        total: data.total || 0,
      };
    },
    staleTime: 60 * 1000,
  });
};

