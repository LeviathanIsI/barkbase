import { createAWSClient } from './aws-client';

// 1. Initialize the AWS client with configuration from environment variables.
// The VITE_ prefix is used here, adjust if your framework is different (e.g., NEXT_PUBLIC_, REACT_APP_).
const awsClient = createAWSClient({
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
  clientId: import.meta.env.VITE_CLIENT_ID || '',
  // Provide a safe development default so data hooks don't crash when env isn't set
  apiUrl: import.meta.env.VITE_API_URL || '/api',
});

/**
 * A simple wrapper around the new awsClient.from() method.
 * This function is now the primary way the frontend will interact with the database via API Gateway.
 * It completely replaces the old fetch-based implementation.
 *
 * @param {string} table - The name of the database table to query (e.g., 'pets', 'users').
 * @returns {ApiClient} - An instance of our ApiClient, ready for chaining methods.
 */
export const from = (table) => {
  return awsClient.from(table);
};

/**
 * Auth client instance.
 * All authentication-related methods (signIn, signOut, getCurrentUser) are exposed here.
 */
export const auth = awsClient.auth;

/**
 * Storage client instance.
 * All storage-related methods (getUploadUrl, getDownloadUrl) are exposed here.
 */
export const storage = awsClient.storage;

/**
 * Upload client for backward compatibility.
 * This simulates the old upload functionality for development.
 */
export const uploadClient = async (endpoint, formData) => {
  // TODO: Implement proper file upload using AWS S3 pre-signed URLs
  // For now, simulate a successful upload
  console.warn('uploadClient() is not yet implemented. Simulating successful upload.');

  return {
    success: true,
    message: 'File uploaded successfully (mock)',
    // Simulate a response that might contain file info
    data: {
      url: 'https://example.com/mock-uploaded-file.jpg'
    }
  };
};

// The main export is now an object containing the clients,
// but for backward compatibility, we can keep a default export if needed.
const apiClient = {
  from,
  auth,
  storage,
  uploadClient,
};

export { apiClient };
export default apiClient;

