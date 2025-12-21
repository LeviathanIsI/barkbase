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

// ===== TEMPLATES =====

/**
 * Get all workflow templates
 */
export async function getWorkflowTemplates(params = {}) {
  const searchParams = new URLSearchParams();

  if (params.category) searchParams.append('category', params.category);
  if (params.objectType) searchParams.append('objectType', params.objectType);

  const queryString = searchParams.toString();
  const url = queryString
    ? `${BASE_URL}/templates?${queryString}`
    : `${BASE_URL}/templates`;

  return apiClient.get(url);
}

/**
 * Get a single template by ID
 */
export async function getWorkflowTemplate(templateId) {
  return apiClient.get(`${BASE_URL}/templates/${templateId}`);
}

/**
 * Create workflow from template
 */
export async function createWorkflowFromTemplate(templateId, data = {}) {
  return apiClient.post(`${BASE_URL}/templates/${templateId}/use`, data);
}

// ===== ENROLLMENTS =====

/**
 * Manually enroll a record in a workflow
 */
export async function enrollRecord(workflowId, data) {
  return apiClient.post(`${BASE_URL}/${workflowId}/enroll`, data);
}

/**
 * Unenroll a record from a workflow
 */
export async function unenrollRecord(workflowId, enrollmentId) {
  return apiClient.delete(`${BASE_URL}/${workflowId}/enrollments/${enrollmentId}`);
}

/**
 * Retry a failed execution
 * @param {string} workflowId - The workflow ID
 * @param {string} executionId - The execution ID (optional if retryAll is true)
 * @param {boolean} retryAll - If true, retry all failed executions for this workflow
 */
export async function retryExecution(workflowId, executionId, retryAll = false) {
  if (retryAll) {
    return apiClient.post(`${BASE_URL}/${workflowId}/executions/retry-all`);
  }
  return apiClient.post(`${BASE_URL}/${workflowId}/executions/${executionId}/retry`);
}

/**
 * Get workflow history/logs
 */
export async function getWorkflowHistory(workflowId, params = {}) {
  const searchParams = new URLSearchParams();

  if (params.eventType) searchParams.append('eventType', params.eventType);
  if (params.actionType) searchParams.append('actionType', params.actionType);
  if (params.stepId) searchParams.append('stepId', params.stepId);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.recordId) searchParams.append('recordId', params.recordId);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);

  const queryString = searchParams.toString();
  const url = queryString
    ? `${BASE_URL}/${workflowId}/history?${queryString}`
    : `${BASE_URL}/${workflowId}/history`;

  return apiClient.get(url);
}

/**
 * Get workflow analytics
 */
export async function getWorkflowAnalytics(workflowId, params = {}) {
  const searchParams = new URLSearchParams();

  if (params.period) searchParams.append('period', params.period);

  const queryString = searchParams.toString();
  const url = queryString
    ? `${BASE_URL}/${workflowId}/analytics?${queryString}`
    : `${BASE_URL}/${workflowId}/analytics`;

  return apiClient.get(url);
}

/**
 * Test workflow with a specific record (dry run)
 */
export async function testWorkflow(workflowId, data) {
  return apiClient.post(`${BASE_URL}/${workflowId}/test`, data);
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
  // Templates
  getWorkflowTemplates,
  getWorkflowTemplate,
  createWorkflowFromTemplate,
  // Enrollments
  enrollRecord,
  unenrollRecord,
  retryExecution,
  getWorkflowHistory,
  getWorkflowAnalytics,
  testWorkflow,
};
