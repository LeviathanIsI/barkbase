/**
 * =============================================================================
 * BarkBase Demo - API Client
 * =============================================================================
 *
 * This file exports the mock API client for demo purposes.
 * The mock client simulates all API responses using static data.
 *
 * =============================================================================
 */

import mockApiClient, { resetDemoState } from './mockApiClient';

// Re-export the mock client as the default API client
export const auth = mockApiClient.auth;
export const storage = mockApiClient.storage;
export const uploadFile = mockApiClient.uploadFile;

// Export reset function for demo UI
export { resetDemoState };

// Export the client with all methods
export const apiClient = mockApiClient;
export default mockApiClient;
