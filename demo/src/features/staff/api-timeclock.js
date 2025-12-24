/**
 * Time Clock API - Staff time tracking
 */
import { apiClient } from '@/lib/apiClient';

const BASE_URL = '/api/v1/staff';

/**
 * Clock in - start a time entry
 */
export async function clockIn(data = {}) {
  return apiClient.post(`${BASE_URL}/clock-in`, data);
}

/**
 * Clock out - end a time entry
 */
export async function clockOut(data = {}) {
  return apiClient.post(`${BASE_URL}/clock-out`, data);
}

/**
 * Start break
 */
export async function startBreak(data = {}) {
  return apiClient.post(`${BASE_URL}/break/start`, data);
}

/**
 * End break
 */
export async function endBreak(data = {}) {
  return apiClient.post(`${BASE_URL}/break/end`, data);
}

/**
 * Get current time status for staff
 */
export async function getTimeStatus(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.staffId) searchParams.append('staffId', params.staffId);
  const queryString = searchParams.toString();
  return apiClient.get(`${BASE_URL}/time-status${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get time entries
 */
export async function getTimeEntries(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.staffId) searchParams.append('staffId', params.staffId);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.status) searchParams.append('status', params.status);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);
  
  const queryString = searchParams.toString();
  return apiClient.get(`${BASE_URL}/time-entries${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get single time entry
 */
export async function getTimeEntry(entryId) {
  return apiClient.get(`${BASE_URL}/time-entries/${entryId}`);
}

/**
 * Update time entry
 */
export async function updateTimeEntry(entryId, data) {
  return apiClient.put(`${BASE_URL}/time-entries/${entryId}`, data);
}

/**
 * Delete time entry
 */
export async function deleteTimeEntry(entryId) {
  return apiClient.delete(`${BASE_URL}/time-entries/${entryId}`);
}

/**
 * Approve time entry
 */
export async function approveTimeEntry(entryId, data = {}) {
  return apiClient.post(`${BASE_URL}/time-entries/${entryId}/approve`, data);
}

export default {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getTimeStatus,
  getTimeEntries,
  getTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  approveTimeEntry,
};

