/**
 * Shifts/Schedule API
 */
import { apiClient } from '@/lib/apiClient';

const BASE_URL = '/api/v1/shifts';

/**
 * Get shifts with optional filters
 */
export async function getShifts(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.staffId) searchParams.append('staffId', params.staffId);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.status) searchParams.append('status', params.status);
  if (params.role) searchParams.append('role', params.role);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);
  
  const queryString = searchParams.toString();
  return apiClient.get(`${BASE_URL}${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get single shift
 */
export async function getShift(shiftId) {
  return apiClient.get(`${BASE_URL}/${shiftId}`);
}

/**
 * Create a shift
 */
export async function createShift(data) {
  return apiClient.post(BASE_URL, data);
}

/**
 * Update a shift
 */
export async function updateShift(shiftId, data) {
  return apiClient.put(`${BASE_URL}/${shiftId}`, data);
}

/**
 * Delete a shift
 */
export async function deleteShift(shiftId) {
  return apiClient.delete(`${BASE_URL}/${shiftId}`);
}

/**
 * Confirm a shift
 */
export async function confirmShift(shiftId) {
  return apiClient.post(`${BASE_URL}/${shiftId}/confirm`);
}

/**
 * Bulk create shifts
 */
export async function bulkCreateShifts(shifts) {
  return apiClient.post(`${BASE_URL}/bulk`, { shifts });
}

/**
 * Get weekly schedule
 */
export async function getWeeklySchedule(weekStart) {
  const params = weekStart ? `?weekStart=${weekStart}` : '';
  return apiClient.get(`${BASE_URL}/week${params}`);
}

/**
 * Get shift templates
 */
export async function getShiftTemplates() {
  return apiClient.get(`${BASE_URL}/templates`);
}

/**
 * Create shift template
 */
export async function createShiftTemplate(data) {
  return apiClient.post(`${BASE_URL}/templates`, data);
}

/**
 * Clone a week's schedule to another week
 */
export async function cloneWeek(sourceWeekStart, targetWeekStart) {
  return apiClient.post(`${BASE_URL}/clone-week`, { sourceWeekStart, targetWeekStart });
}

/**
 * Publish a week's schedule (notify staff, lock changes)
 */
export async function publishSchedule(weekStart) {
  return apiClient.post(`${BASE_URL}/publish`, { weekStart });
}

export default {
  getShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift,
  confirmShift,
  bulkCreateShifts,
  getWeeklySchedule,
  getShiftTemplates,
  createShiftTemplate,
  cloneWeek,
  publishSchedule,
};

