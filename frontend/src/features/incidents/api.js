/**
 * Incident API - Incident reporting and management
 */
import { apiClient } from '@/lib/apiClient';

const BASE_URL = '/api/v1/incidents';

/**
 * Get all incidents for the tenant
 */
export async function getIncidents(params = {}) {
  const searchParams = new URLSearchParams();
  
  if (params.status) searchParams.append('status', params.status);
  if (params.severity) searchParams.append('severity', params.severity);
  if (params.type) searchParams.append('type', params.type);
  if (params.petId) searchParams.append('petId', params.petId);
  if (params.ownerId) searchParams.append('ownerId', params.ownerId);
  if (params.startDate) searchParams.append('startDate', params.startDate);
  if (params.endDate) searchParams.append('endDate', params.endDate);
  if (params.limit) searchParams.append('limit', params.limit);
  if (params.offset) searchParams.append('offset', params.offset);

  const queryString = searchParams.toString();
  const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
  
  return apiClient.get(url);
}

/**
 * Get a single incident by ID
 */
export async function getIncident(incidentId) {
  return apiClient.get(`${BASE_URL}/${incidentId}`);
}

/**
 * Create a new incident report
 */
export async function createIncident(data) {
  return apiClient.post(BASE_URL, data);
}

/**
 * Update an existing incident
 */
export async function updateIncident(incidentId, data) {
  return apiClient.put(`${BASE_URL}/${incidentId}`, data);
}

/**
 * Delete an incident (soft delete)
 */
export async function deleteIncident(incidentId) {
  return apiClient.delete(`${BASE_URL}/${incidentId}`);
}

/**
 * Resolve an incident
 */
export async function resolveIncident(incidentId, data = {}) {
  return apiClient.post(`${BASE_URL}/${incidentId}/resolve`, data);
}

/**
 * Notify owner of an incident
 */
export async function notifyOwnerOfIncident(incidentId, data = {}) {
  return apiClient.post(`${BASE_URL}/${incidentId}/notify-owner`, data);
}

// Export default object for convenience
export default {
  getIncidents,
  getIncident,
  createIncident,
  updateIncident,
  deleteIncident,
  resolveIncident,
  notifyOwnerOfIncident,
};

