/**
 * Tasks API Hooks
 * 
 * Uses the shared API hook factory for standardized query/mutation patterns.
 * All hooks are tenant-aware and follow consistent error handling.
 * 
 * Task mutations also invalidate calendar and dashboard queries to keep
 * all schedule-related views in sync.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { normalizeListResponse } from '@/lib/createApiHooks';
import { listQueryDefaults, detailQueryDefaults } from '@/lib/queryConfig';

// ============================================================================
// TENANT HELPERS
// ============================================================================

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Check if tenant is ready for API calls
 * Queries should be disabled until tenantId is available
 */
const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

// ============================================================================
// TASK STATUS ENUM (consistent with calendar events)
// ============================================================================

/**
 * Canonical task status values
 * Used by both tasks and calendar features
 */
export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE',
};

/**
 * Canonical task type values
 */
export const TASK_TYPE = {
  FEEDING: 'FEEDING',
  MEDICATION: 'MEDICATION',
  GROOMING: 'GROOMING',
  EXERCISE: 'EXERCISE',
  CLEANING: 'CLEANING',
  CHECK_IN: 'CHECK_IN',
  CHECK_OUT: 'CHECK_OUT',
  ADMIN: 'ADMIN',
  OTHER: 'OTHER',
};

// ============================================================================
// TASK NORMALIZERS
// ============================================================================

/**
 * Normalize a single task record for consistent shape
 * Ensures fields match what calendar events expect
 *
 * Backend response shape (from operations-service):
 * {
 *   id, tenantId, title, description, status, priority,
 *   dueDate, completedAt, assignedTo, assigneeName,
 *   bookingId, petId, petName, createdAt, updatedAt
 * }
 *
 * @param {object} task - Raw task from API
 * @returns {object} Normalized task
 */
const normalizeTask = (task) => {
  if (!task) return null;

  // Compute status based on completion and due date
  let computedStatus = task.status?.toUpperCase() || TASK_STATUS.PENDING;
  if (task.completedAt) {
    computedStatus = TASK_STATUS.COMPLETED;
  } else if (task.dueDate && new Date(task.dueDate) < new Date() && !task.completedAt) {
    computedStatus = TASK_STATUS.OVERDUE;
  }

  // Normalize type to uppercase
  const taskType = task.type?.toUpperCase() || TASK_TYPE.OTHER;

  // Get pet name from various sources
  const petName = task.petName || task.pet?.name;

  // Build title for calendar display using backend title or fallback
  const title = task.title ||
    (petName
      ? `${taskType} - ${petName}`
      : taskType);

  return {
    ...task,
    // Canonical status
    status: computedStatus,
    // Normalized type
    type: taskType,
    // Normalized datetime fields (map dueDate to scheduledFor for frontend consistency)
    scheduledFor: task.scheduledFor || task.dueDate || task.dueAt || task.scheduledAt || null,
    dueDate: task.dueDate || task.scheduledFor || null,
    completedAt: task.completedAt || null,
    // Related entity links (for calendar/detail views)
    petId: task.petId || task.pet?.recordId || null,
    petName: petName || null,
    ownerId: task.ownerId || task.owner?.recordId || null,
    ownerName: task.ownerName || task.owner?.name ||
      (task.owner ? `${task.owner.firstName || ''} ${task.owner.lastName || ''}`.trim() : null),
    bookingId: task.bookingId || null,
    // Assignee info from backend
    assignedTo: task.assignedTo || null,
    assigneeName: task.assigneeName || null,
    // Computed title for calendar events
    title,
    // Priority normalization - backend uses integers (1=low, 2=medium, 3=high, 4=urgent)
    priority: typeof task.priority === 'number'
      ? ['LOW', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'][task.priority] || 'MEDIUM'
      : (typeof task.priority === 'string' ? task.priority.toUpperCase() : 'MEDIUM'),
  };
};

/**
 * Normalize tasks list response
 * Handles various response shapes and normalizes each task
 */
const normalizeTasksResponse = (data) => {
  const normalized = normalizeListResponse(data, 'tasks');
  return normalized.items.map(normalizeTask);
};

// ============================================================================
// INVALIDATION HELPERS
// ============================================================================

/**
 * Get all query keys that should be invalidated when tasks change
 * @param {string} tenantKey - Current tenant key
 * @returns {Array} Array of query key patterns to invalidate
 */
const getTaskInvalidationKeys = (tenantKey) => [
  [tenantKey, 'tasks'], // All task queries
  queryKeys.calendar(tenantKey, {}), // Calendar events
  queryKeys.dashboard(tenantKey), // Dashboard stats/counts
];

// ============================================================================
// LIST QUERIES
// ============================================================================

/**
 * Fetch all tasks for the current tenant
 * Supports filtering by date, status, type, petId, etc.
 * 
 * @param {object} filters - Query params
 * @returns {UseQueryResult} React Query result with tasks array
 */
export const useTasksQuery = (filters = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: queryKeys.tasks(tenantKey, filters),
    enabled: isTenantReady,
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.tasks.list, { params: filters });
        return normalizeTasksResponse(res?.data);
      } catch (e) {
        console.warn('[tasks] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
  });
};

/**
 * Fetch today's tasks
 * Filters from full task list client-side for now
 */
export const useTodaysTasksQuery = () => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.tasks(tenantKey, { type: 'today' }),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.tasks.list);
        const tasks = normalizeTasksResponse(res?.data);
        
        // Filter for today
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
  });
};

/**
 * Fetch overdue tasks
 * Filters from full task list client-side for now
 */
export const useOverdueTasksQuery = () => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.tasks(tenantKey, { type: 'overdue' }),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.tasks.list);
        const tasks = normalizeTasksResponse(res?.data);
        
        const now = Date.now();
        return tasks.filter((t) => 
          t.scheduledFor && 
          !t.completedAt && 
          new Date(t.scheduledFor).getTime() < now
        );
      } catch (e) {
        console.warn('[overdueTasks] Falling back to empty list due to API error:', e?.message || e);
        return [];
      }
    },
    ...listQueryDefaults,
    staleTime: 60 * 1000,
  });
};

// ============================================================================
// DETAIL QUERY
// ============================================================================

/**
 * Fetch a single task by ID
 * 
 * @param {string} taskId - Task record ID
 * @param {object} options - React Query options
 * @returns {UseQueryResult} React Query result with task object
 */
export const useTaskQuery = (taskId, options = {}) => {
  const tenantKey = useTenantKey();
  
  return useQuery({
    queryKey: queryKeys.tasks(tenantKey, { id: taskId }),
    queryFn: async () => {
      try {
        const res = await apiClient.get(canonicalEndpoints.tasks.detail(taskId));
        return normalizeTask(res?.data);
      } catch (e) {
        console.warn('[task] Falling back to null due to API error:', e?.message || e);
        return null;
      }
    },
    enabled: !!taskId && (options.enabled !== false),
    ...detailQueryDefaults,
    ...options,
  });
};

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new task
 * Invalidates tasks, calendar, and dashboard queries
 */
export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (taskData) => {
      const res = await apiClient.post(canonicalEndpoints.tasks.list, taskData);
      return normalizeTask(res.data);
    },
    onSuccess: () => {
      getTaskInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};

/**
 * Update an existing task
 * 
 * @param {string} taskId - Task to update
 */
export const useUpdateTaskMutation = (taskId) => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (updates) => {
      const res = await apiClient.put(canonicalEndpoints.tasks.detail(taskId), updates);
      return normalizeTask(res.data);
    },
    onSuccess: () => {
      getTaskInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};

/**
 * Complete a task
 * Sets completedAt and updates status
 */
export const useCompleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async ({ taskId, notes }) => {
      const res = await apiClient.post(canonicalEndpoints.tasks.complete(taskId), { notes });
      return normalizeTask(res.data);
    },
    onSuccess: () => {
      getTaskInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};

/**
 * Delete a task
 */
export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();
  const tenantKey = useTenantKey();
  
  return useMutation({
    mutationFn: async (taskId) => {
      await apiClient.delete(canonicalEndpoints.tasks.detail(taskId));
      return taskId;
    },
    onSuccess: () => {
      getTaskInvalidationKeys(tenantKey).forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};

// ============================================================================
// CONVENIENCE ALIASES
// ============================================================================

export const useTaskDetailQuery = useTaskQuery;

// TODO: Consider adding useTaskSearchQuery using createSearchQuery factory.
// TODO: Add optimistic updates for common task actions (complete, snooze).
// TODO: Review tasks/calendar event mapping once Today view is consolidated.
// TODO: Add server-side filtering for today/overdue tasks when backend supports it.
