/**
 * =============================================================================
 * BarkBase Demo API Client
 * =============================================================================
 *
 * This file re-exports the mock API client for demo mode.
 * All API calls are intercepted and routed to sessionStorage.
 * =============================================================================
 */

import mockApiClient, { auth, storage, uploadFile } from './mockApiClient';

// Re-export everything from the mock client
export { auth, storage, uploadFile };
export const uploadClient = uploadFile;
export const apiClient = mockApiClient;
export default mockApiClient;
