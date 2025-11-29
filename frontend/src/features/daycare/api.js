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
      console.log('[runs] Fetched runs:', data.length);

      // Map to expected format with recordId for consistency
      return data.map(run => ({
        ...run,
        recordId: run.id,
        capacity: run.maxCapacity || 10,  // Alias for backward compatibility
      }));
    },
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData ?? [],
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
 *
 * =============================================================================
 * WARNING: RUN ASSIGNMENT PERSISTENCE IS NOT IMPLEMENTED
 * =============================================================================
 *
 * This mutation is TEMPORARILY DISABLED because the backend does not have a
 * working endpoint to persist run assignments.
 *
 * Current state of backend (operations-service/index.js):
 * - PUT /api/v1/runs/:id only updates Run metadata (name, code, etc.)
 * - It does NOT process the { assignedPets } payload
 * - There is NO endpoint like POST /api/v1/runs/assignments to create assignments
 *
 * TODO: To implement run assignment persistence, the backend needs:
 * 1. POST /api/v1/runs/assignments - Create/update assignments for a run + date
 *    Payload: { runId, date, assignments: [{ petId, bookingId, startAt, endAt }] }
 *    Should INSERT into RunAssignment table or UPDATE existing assignments
 *
 * 2. DELETE /api/v1/runs/assignments/:id - Remove a specific assignment
 *    (This already exists as POST /api/v1/runs/:id/remove-pet)
 *
 * Once backend is implemented, update this mutation to call the correct endpoint.
 * =============================================================================
 */
export const useAssignPetsToRunMutation = () => {
  return useMutation({
    mutationFn: async ({ runId, assignedPets, date }) => {
      // DO NOT call the backend - it doesn't persist assignments
      // Instead, reject with a clear error message so the UI can handle it honestly
      throw new Error(
        'Run assignment save is not implemented yet. ' +
        'The backend does not have an endpoint to persist pet-to-run assignments. ' +
        'Your changes have NOT been saved.'
      );
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

      console.log('[runAssignments] Fetched for', dateStr, ':', assignments.length, 'assignments,', runsFromApi.length, 'runs');

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
    placeholderData: (previousData) => previousData ?? [],
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

      console.log('[runAssignments] Range query:', params, '- Found:', data.total || 0);

      return {
        assignments: data.data || data.assignments || [],
        runs: data.runs || [],
        startDate: data.startDate,
        endDate: data.endDate,
        total: data.total || 0,
      };
    },
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData ?? { assignments: [], runs: [], total: 0 },
  });
};

/**
 * Remove pet from run
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
