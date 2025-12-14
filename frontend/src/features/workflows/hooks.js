/**
 * Workflows React Query Hooks
 * Custom hooks wrapping the workflows API with React Query
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

// Query keys for cache management
export const WORKFLOW_QUERY_KEYS = {
  all: ['workflows'],
  lists: () => [...WORKFLOW_QUERY_KEYS.all, 'list'],
  list: (params) => [...WORKFLOW_QUERY_KEYS.lists(), params],
  details: () => [...WORKFLOW_QUERY_KEYS.all, 'detail'],
  detail: (id) => [...WORKFLOW_QUERY_KEYS.details(), id],
  steps: (id) => [...WORKFLOW_QUERY_KEYS.all, 'steps', id],
  executions: (id, params) => [...WORKFLOW_QUERY_KEYS.all, 'executions', id, params],
  execution: (workflowId, executionId) => [...WORKFLOW_QUERY_KEYS.all, 'execution', workflowId, executionId],
  analytics: (id, params) => [...WORKFLOW_QUERY_KEYS.all, 'analytics', id, params],
  history: (id, params) => [...WORKFLOW_QUERY_KEYS.all, 'history', id, params],
  stats: () => [...WORKFLOW_QUERY_KEYS.all, 'stats'],
  folders: () => [...WORKFLOW_QUERY_KEYS.all, 'folders'],
  templates: () => [...WORKFLOW_QUERY_KEYS.all, 'templates'],
  template: (id) => [...WORKFLOW_QUERY_KEYS.templates(), id],
};

// ===== WORKFLOWS =====

/**
 * Fetch all workflows with optional filters
 */
export function useWorkflows(params = {}) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.list(params),
    queryFn: () => api.getWorkflows(params),
  });
}

/**
 * Fetch a single workflow by ID
 */
export function useWorkflow(workflowId) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.detail(workflowId),
    queryFn: () => api.getWorkflow(workflowId),
    enabled: !!workflowId && workflowId !== 'new',
  });
}

/**
 * Create a new workflow
 */
export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Update an existing workflow
 */
export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, data }) => api.updateWorkflow(workflowId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.detail(variables.workflowId) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Delete a workflow
 */
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Clone a workflow
 */
export function useCloneWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.cloneWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Activate a workflow
 */
export function useActivateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.activateWorkflow,
    onSuccess: (_, workflowId) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.detail(workflowId) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.stats() });
    },
  });
}

/**
 * Pause a workflow
 */
export function usePauseWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.pauseWorkflow,
    onSuccess: (_, workflowId) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.detail(workflowId) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.stats() });
    },
  });
}

// ===== WORKFLOW STEPS =====

/**
 * Fetch steps for a workflow
 */
export function useWorkflowSteps(workflowId) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.steps(workflowId),
    queryFn: () => api.getWorkflowSteps(workflowId),
    enabled: !!workflowId && workflowId !== 'new',
  });
}

/**
 * Update workflow steps (full replacement)
 */
export function useUpdateWorkflowSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, steps }) => api.updateWorkflowSteps(workflowId, steps),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.steps(variables.workflowId) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.detail(variables.workflowId) });
    },
  });
}

// ===== EXECUTIONS =====

/**
 * Fetch executions for a workflow
 */
export function useWorkflowExecutions(workflowId, params = {}) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.executions(workflowId, params),
    queryFn: () => api.getWorkflowExecutions(workflowId, params),
    enabled: !!workflowId,
  });
}

/**
 * Fetch execution details with logs
 */
export function useExecutionDetails(workflowId, executionId) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.execution(workflowId, executionId),
    queryFn: () => api.getExecutionDetails(workflowId, executionId),
    enabled: !!workflowId && !!executionId,
  });
}

/**
 * Cancel an execution
 */
export function useCancelExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, executionId }) => api.cancelExecution(workflowId, executionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.executions(variables.workflowId, {}) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.execution(variables.workflowId, variables.executionId) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.analytics(variables.workflowId, {}) });
    },
  });
}

// ===== ENROLLMENTS =====

/**
 * Manually enroll a record in a workflow
 */
export function useEnrollRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, data }) => api.enrollRecord(workflowId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.executions(variables.workflowId, {}) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.analytics(variables.workflowId, {}) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.detail(variables.workflowId) });
    },
  });
}

/**
 * Unenroll a record from a workflow
 */
export function useUnenrollRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, enrollmentId }) => api.unenrollRecord(workflowId, enrollmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.executions(variables.workflowId, {}) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.analytics(variables.workflowId, {}) });
    },
  });
}

// ===== ANALYTICS =====

/**
 * Fetch workflow analytics
 */
export function useWorkflowAnalytics(workflowId, params = {}) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.analytics(workflowId, params),
    queryFn: () => api.getWorkflowAnalytics(workflowId, params),
    enabled: !!workflowId,
  });
}

/**
 * Fetch workflow history/logs
 */
export function useWorkflowHistory(workflowId, params = {}) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.history(workflowId, params),
    queryFn: () => api.getWorkflowHistory(workflowId, params),
    enabled: !!workflowId,
  });
}

/**
 * Fetch overall workflow stats
 */
export function useWorkflowStats() {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.stats(),
    queryFn: api.getWorkflowStats,
  });
}

// ===== FOLDERS =====

/**
 * Fetch workflow folders
 */
export function useWorkflowFolders() {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.folders(),
    queryFn: api.getWorkflowFolders,
  });
}

/**
 * Create a workflow folder
 */
export function useCreateWorkflowFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createWorkflowFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.folders() });
    },
  });
}

/**
 * Update a workflow folder
 */
export function useUpdateWorkflowFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ folderId, data }) => api.updateWorkflowFolder(folderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.folders() });
    },
  });
}

/**
 * Delete a workflow folder
 */
export function useDeleteWorkflowFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteWorkflowFolder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.folders() });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Move workflow to folder
 */
export function useMoveWorkflowToFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workflowId, folderId }) => api.moveWorkflowToFolder(workflowId, folderId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.detail(variables.workflowId) });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
    },
  });
}

// ===== TEMPLATES =====

/**
 * Fetch workflow templates
 */
export function useWorkflowTemplates(params = {}) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.templates(),
    queryFn: () => api.getWorkflowTemplates(params),
  });
}

/**
 * Fetch a single template
 */
export function useWorkflowTemplate(templateId) {
  return useQuery({
    queryKey: WORKFLOW_QUERY_KEYS.template(templateId),
    queryFn: () => api.getWorkflowTemplate(templateId),
    enabled: !!templateId,
  });
}

/**
 * Create workflow from template
 */
export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, data }) => api.createWorkflowFromTemplate(templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: WORKFLOW_QUERY_KEYS.stats() });
    },
  });
}

// ===== TESTING =====

/**
 * Test workflow with a specific record (dry run)
 */
export function useTestWorkflow() {
  return useMutation({
    mutationFn: ({ workflowId, data }) => api.testWorkflow(workflowId, data),
  });
}
