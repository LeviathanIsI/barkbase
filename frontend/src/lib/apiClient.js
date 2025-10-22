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

// Table-style client removed: frontend should use explicit REST endpoints via helpers below.

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

// Lightweight REST helpers for feature APIs that call concrete endpoints
const buildUrl = (path, params) => {
  const base = import.meta.env.VITE_API_URL || '/api';
  const url = new URL(path, base);
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
};

const buildHeaders = async () => {
  const { useAuthStore } = await import('@/stores/auth');
  const accessToken = useAuthStore.getState().accessToken;
  return {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };
};

const get = async (path, { params } = {}) => {
  const url = buildUrl(path, params);
  const headers = await buildHeaders();
  const res = await fetch(url, { method: 'GET', headers });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return { data: await res.json() };
};

const post = async (path, body) => {
  const url = buildUrl(path);
  const headers = await buildHeaders();
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return { data: await res.json() };
};

const put = async (path, body) => {
  const url = buildUrl(path);
  const headers = await buildHeaders();
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return { data: await res.json() };
};

const del = async (path, options = {}) => {
  const url = buildUrl(path, options.params);
  const headers = await buildHeaders();
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    body: options?.data ? JSON.stringify(options.data) : undefined,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  if (res.status === 204) {
    return { data: null };
  }
  return { data: await res.json() };
};

// The main export is now an object containing the clients,
// but for backward compatibility, we can keep a default export if needed.
const apiClient = {
  auth,
  storage,
  uploadClient,
  get,
  post,
  put,
  delete: del,
};

export { apiClient };
export default apiClient;

