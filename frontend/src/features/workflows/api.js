/**
 * Workflows API - Workflow automation management
 */
import { apiClient } from '@/lib/apiClient';

const BASE_URL = '/api/v1/workflows';

/**
 * Get all workflows for the tenant
 */
export async function getWorkflows(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.append('status', params.status);
  if (params.objectType) searchParams.append('objectType', params.objectType);
  if (params.folderId) searchParams.append('folderId', params.folderId);
  if (params.search) searchParams.append('search', params.search);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);

  const queryString = searchParams.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;

  return apiClient.get(url);
}

/**
 * Get a single workflow by ID
 */
export async function getWorkflow(workflowId) {
  return apiClient.get(`${BASE_URL}/${workflowId}`);
}

/**
 * Create a new workflow
 */
export async function createWorkflow(data) {
  return apiClient.post(BASE_URL, data);
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(workflowId, data) {
  return apiClient.put(`${BASE_URL}/${workflowId}`, data);
}

/**
 * Delete a workflow (soft delete)
 */
export async function deleteWorkflow(workflowId) {
  return apiClient.delete(`${BASE_URL}/${workflowId}`);
}

/**
 * Clone a workflow
 */
export async function cloneWorkflow(workflowId) {
  return apiClient.post(`${BASE_URL}/${workflowId}/clone`);
}

/**
 * Activate a workflow
 */
export async function activateWorkflow(workflowId) {
  return apiClient.post(`${BASE_URL}/${workflowId}/activate`);
}

/**
 * Pause a workflow
 */
export async function pauseWorkflow(workflowId) {
  return apiClient.post(`${BASE_URL}/${workflowId}/pause`);
}

/**
 * Get workflow steps
 */
export async function getWorkflowSteps(workflowId) {
  return apiClient.get(`${BASE_URL}/${workflowId}/steps`);
}

/**
 * Update workflow steps (full replacement)
 */
export async function updateWorkflowSteps(workflowId, steps) {
  return apiClient.put(`${BASE_URL}/${workflowId}/steps`, { steps });
}

/**
 * Get workflow executions
 */
export async function getWorkflowExecutions(workflowId, params = {}) {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.append('status', params.status);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);

  const queryString = searchParams.toString();
  const url = queryString
    ? `${BASE_URL}/${workflowId}/executions?${queryString}`
    : `${BASE_URL}/${workflowId}/executions`;

  return apiClient.get(url);
}

/**
 * Get execution details with logs
 */
export async function getExecutionDetails(workflowId, executionId) {
  return apiClient.get(`${BASE_URL}/${workflowId}/executions/${executionId}`);
}

/**
 * Cancel an execution
 */
export async function cancelExecution(workflowId, executionId) {
  return apiClient.post(`${BASE_URL}/${workflowId}/executions/${executionId}/cancel`);
}

/**
 * Get workflow folders
 */
export async function getWorkflowFolders() {
  return apiClient.get(`${BASE_URL}/folders`);
}

/**
 * Create a workflow folder
 */
export async function createWorkflowFolder(data) {
  return apiClient.post(`${BASE_URL}/folders`, data);
}

/**
 * Update a workflow folder
 */
export async function updateWorkflowFolder(folderId, data) {
  return apiClient.put(`${BASE_URL}/folders/${folderId}`, data);
}

/**
 * Delete a workflow folder
 */
export async function deleteWorkflowFolder(folderId) {
  return apiClient.delete(`${BASE_URL}/folders/${folderId}`);
}

/**
 * Move workflow to folder
 */
export async function moveWorkflowToFolder(workflowId, folderId) {
  return apiClient.put(`${BASE_URL}/${workflowId}`, { folder_id: folderId });
}

/**
 * Get workflow stats
 */
export async function getWorkflowStats() {
  return apiClient.get(`${BASE_URL}/stats`);
}

// Export default object for convenience
export default {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  cloneWorkflow,
  activateWorkflow,
  pauseWorkflow,
  getWorkflowSteps,
  updateWorkflowSteps,
  getWorkflowExecutions,
  getExecutionDetails,
  cancelExecution,
  getWorkflowFolders,
  createWorkflowFolder,
  updateWorkflowFolder,
  deleteWorkflowFolder,
  moveWorkflowToFolder,
  getWorkflowStats,
};
