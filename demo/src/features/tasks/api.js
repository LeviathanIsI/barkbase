/**
 * Demo Tasks API
 * Provides mock data hooks for tasks management.
 * Replaces real API calls with static demo data.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dashboardData from '@/data/dashboard.json';

// ============================================================================
// TASK STATUS ENUM
// ============================================================================

export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  OVERDUE: 'OVERDUE',
};

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
// MOCK DATA HELPERS
// ============================================================================

/**
 * Get tasks from dashboard data and normalize them
 */
const getTasksFromDashboard = () => {
  const tasks = dashboardData.today.tasks || [];

  return tasks.map((task, index) => {
    // Parse time from task
    const [hours, minutes] = (task.time || '12:00').split(':').map(Number);
    const scheduledDate = new Date();
    scheduledDate.setHours(hours, minutes, 0, 0);

    const status = task.status?.toUpperCase() || TASK_STATUS.PENDING;

    return {
      id: task.id || `task-${index}`,
      title: task.title,
      type: task.title.toLowerCase().includes('medication')
        ? TASK_TYPE.MEDICATION
        : task.title.toLowerCase().includes('groom')
        ? TASK_TYPE.GROOMING
        : task.title.toLowerCase().includes('check in')
        ? TASK_TYPE.CHECK_IN
        : task.title.toLowerCase().includes('checkout')
        ? TASK_TYPE.CHECK_OUT
        : task.title.toLowerCase().includes('photo')
        ? TASK_TYPE.ADMIN
        : TASK_TYPE.OTHER,
      status,
      scheduledFor: scheduledDate.toISOString(),
      dueDate: scheduledDate.toISOString(),
      petName: task.pet || null,
      assigneeName: task.assignee || null,
      completedAt: status === TASK_STATUS.COMPLETED ? new Date().toISOString() : null,
      priority: 'MEDIUM',
    };
  });
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all tasks
 */
export const useTasksQuery = (filters = {}) => {
  return useQuery({
    queryKey: ['demo', 'tasks', filters],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      return getTasksFromDashboard();
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch today's tasks
 */
export const useTodaysTasksQuery = () => {
  return useQuery({
    queryKey: ['demo', 'tasks', 'today'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      const tasks = getTasksFromDashboard();

      // Filter for today's tasks
      const today = new Date();
      return tasks.filter((t) => {
        if (!t.scheduledFor) return false;
        const taskDate = new Date(t.scheduledFor);
        return (
          taskDate.getDate() === today.getDate() &&
          taskDate.getMonth() === today.getMonth() &&
          taskDate.getFullYear() === today.getFullYear()
        );
      });
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch overdue tasks
 */
export const useOverdueTasksQuery = () => {
  return useQuery({
    queryKey: ['demo', 'tasks', 'overdue'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));
      const tasks = getTasksFromDashboard();

      const now = Date.now();
      return tasks.filter(
        (t) =>
          t.scheduledFor &&
          !t.completedAt &&
          new Date(t.scheduledFor).getTime() < now
      );
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Fetch a single task by ID
 */
export const useTaskQuery = (taskId, options = {}) => {
  return useQuery({
    queryKey: ['demo', 'tasks', taskId],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 100));
      const tasks = getTasksFromDashboard();
      return tasks.find((t) => t.id === taskId) || null;
    },
    enabled: !!taskId && (options.enabled !== false),
    ...options,
  });
};

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Complete a task (demo - just invalidates queries)
 */
export const useCompleteTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, notes }) => {
      // Simulate API delay
      await new Promise((r) => setTimeout(r, 500));

      // In demo mode, we just return success
      // The UI will handle optimistic updates
      return { id: taskId, status: TASK_STATUS.COMPLETED, completedAt: new Date().toISOString() };
    },
    onSuccess: () => {
      // Invalidate task queries to refetch
      queryClient.invalidateQueries({ queryKey: ['demo', 'tasks'] });
    },
  });
};

/**
 * Create a new task (demo - just simulates success)
 */
export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData) => {
      await new Promise((r) => setTimeout(r, 500));
      return {
        id: `task-new-${Date.now()}`,
        ...taskData,
        status: TASK_STATUS.PENDING,
        createdAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'tasks'] });
    },
  });
};

/**
 * Update a task (demo - just simulates success)
 */
export const useUpdateTaskMutation = (taskId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates) => {
      await new Promise((r) => setTimeout(r, 500));
      return { id: taskId, ...updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'tasks'] });
    },
  });
};

/**
 * Delete a task (demo - just simulates success)
 */
export const useDeleteTaskMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId) => {
      await new Promise((r) => setTimeout(r, 300));
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'tasks'] });
    },
  });
};

// Alias
export const useTaskDetailQuery = useTaskQuery;
