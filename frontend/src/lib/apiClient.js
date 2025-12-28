/**
 * =============================================================================
 * BarkBase API Client
 * =============================================================================
 * 
 * Centralized API client for all frontend HTTP requests.
 * 
 * FEATURES:
 * ---------
 * - Automatic Authorization header attachment (Bearer token from auth store)
 * - Tenant ID header for multi-tenancy
 * - 401 handling with automatic logout
 * - CRUD helpers (get, post, put, patch, delete)
 * 
 * USAGE:
 * ------
 * import apiClient from '@/lib/apiClient';
 * const { data } = await apiClient.get('/api/v1/pets');
 * 
 * =============================================================================
 */

import { createAWSClient } from './aws-client';
import camelcaseKeys from 'camelcase-keys';

// Initialize the AWS client - configuration is read from @/config/env
const awsClient = createAWSClient();

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

const AUTH_STORAGE_KEYS = ['barkbase-auth', 'barkbase-tenant'];
const AUTH_SESSION_KEYS = ['pkce_verifier'];
const FALLBACK_TENANT_STATE = {
  recordId: null,
  slug: 'default',
  name: 'BarkBase',
  plan: 'FREE',
};

let logoutTriggered = false;

const clearPersistedState = () => {
  if (typeof window === 'undefined') return;

  AUTH_STORAGE_KEYS.forEach((key) => {
    try {
      window.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  });

  AUTH_SESSION_KEYS.forEach((key) => {
    try {
      window.sessionStorage?.removeItem(key);
    } catch {
      // ignore
    }
  });
};

const resetStores = async () => {
  try {
    const [{ useAuthStore }, { useTenantStore }] = await Promise.all([
      import('@/stores/auth'),
      import('@/stores/tenant'),
    ]);

    useAuthStore.getState()?.clearAuth?.();

    useTenantStore.setState((state) => ({
      tenant: {
        ...(state?.tenant ?? FALLBACK_TENANT_STATE),
        ...FALLBACK_TENANT_STATE,
      },
      initialized: false,
      isLoading: false,
    }));

    useTenantStore.persist?.clearStorage?.();
  } catch (error) {
    console.error('[AUTH] Failed to reset stores during auto logout', error);
  }
};

const redirectToLogin = () => {
  if (typeof window === 'undefined') return;
  window.location.href = '/login';
};

const triggerAutoLogout = async () => {
  if (logoutTriggered) return;
  logoutTriggered = true;
  console.warn('[AUTH] Token expired or invalid — auto logout triggered');
  clearPersistedState();
  await resetStores();
  redirectToLogin();
};

/**
 * Handle authentication errors (401/403)
 * - 401 Unauthorized: Token expired or invalid - auto logout
 * - SESSION_EXPIRED error code: Session exceeded auto-logout interval - auto logout
 * - 403 Forbidden: User lacks permission - don't logout, just report
 */
const ensureAuthorized = async (response) => {
  if (response?.status === 401) {
    // Parse response to check for SESSION_EXPIRED error code
    const data = await parseResponse(response);
    const errorCode = data?.code;

    if (errorCode === 'SESSION_EXPIRED' || errorCode === 'SESSION_NOT_FOUND') {
      console.warn('[AUTH] Session expired on server - auto logout');
    } else if (errorCode === 'INVALID_TOKEN' || errorCode === 'UNAUTHORIZED') {
      console.warn('[AUTH] Invalid token - auto logout');
    }

    await triggerAutoLogout();
    throw new Error(data?.message || 'Session expired. Please log in again.');
  }

  // 403 doesn't trigger logout - user is authenticated but lacks permission
  if (response?.status === 403) {
    const data = await parseResponse(response);
    throw new Error(data?.message || 'You do not have permission to perform this action.');
  }
};

const logRequest = (method, url, tenantId) => {
  // Debug logging disabled - uncomment for troubleshooting
  //
};

const logResponse = (status, data) => {
  // Debug logging disabled - uncomment for troubleshooting
  //
};

const parseResponse = async (res) => {
  if (res.status === 204) {
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await res.json();
      // Convert snake_case keys to camelCase for frontend consistency
      return camelcaseKeys(data, { deep: true });
    } catch {
      return null;
    }
  }

  try {
    return await res.text();
  } catch {
    return null;
  }
};

/**
 * Build a user-friendly error from response
 *
 * Backend error response format:
 * { error: "ErrorType", message: "Human readable message" }
 */
const buildError = (res, data) => {
  // String error response
  if (typeof data === 'string' && data.trim()) {
    return new Error(data);
  }

  // Object error response - extract message
  if (data && typeof data === 'object') {
    // Prefer 'message' field, fallback to 'error'
    const message = data.message || data.error || null;
    if (message && typeof message === 'string') {
      return new Error(message);
    }
    // Last resort: stringify the object
    return new Error(JSON.stringify(data));
  }

  // Generic status-based error messages
  const statusMessages = {
    400: 'Invalid request. Please check your input.',
    404: 'The requested resource was not found.',
    409: 'Conflict. This action cannot be completed.',
    422: 'Validation failed. Please check your input.',
    429: 'Too many requests. Please try again later.',
    500: 'An unexpected server error occurred. Please try again.',
    502: 'Service temporarily unavailable. Please try again.',
    503: 'Service temporarily unavailable. Please try again.',
  };

  return new Error(statusMessages[res.status] || `Request failed with status ${res.status}`);
};

/**
 * Upload a file to S3 using presigned URLs.
 * 
 * @param {Object} options - Upload options
 * @param {File} options.file - The File object to upload
 * @param {string} [options.category] - Optional category for path organization (e.g., 'avatars', 'documents')
 * @returns {Promise<{key: string, publicUrl: string}>} The S3 key and public URL of the uploaded file
 * 
 * @example
 * const { key, publicUrl } = await uploadFile({ file: fileObject, category: 'avatars' });
 */
export const uploadFile = async ({ file, category = 'general' }) => {
  if (!file || !(file instanceof File)) {
    throw new Error('A valid File object is required');
  }

  // 1. Get presigned URL from backend
  const { data } = await post('/api/v1/upload-url', {
    fileName: file.name,
    fileType: file.type,
    category,
  });

  const { uploadUrl, key, publicUrl } = data || {};

  if (!uploadUrl) {
    throw new Error('Failed to get upload URL from server');
  }

  // 2. Upload file directly to S3 using the presigned URL
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed with status ${uploadResponse.status}`);
  }

  return { key, publicUrl };
};

/**
 * @deprecated Use uploadFile() instead. This function is kept for backward compatibility.
 */
export const uploadClient = async (endpoint, formData) => {
  console.warn('uploadClient() is deprecated. Use uploadFile() instead.');
  
  // Try to extract file from FormData for backward compatibility
  const file = formData?.get?.('file');
  if (file instanceof File) {
    const result = await uploadFile({ file });
    return {
      success: true,
      message: 'File uploaded successfully',
      data: { url: result.publicUrl || result.key },
    };
  }

  throw new Error('uploadClient() requires FormData with a "file" field. Consider using uploadFile() instead.');
};

// Lightweight REST helpers for feature APIs that call concrete endpoints
import { apiBaseUrl as configApiBaseUrl } from '@/config/env';
const API_BASE_URL = configApiBaseUrl;

const buildUrl = (path, params) => {
  const url = new URL(path, API_BASE_URL);
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url.toString();
};

/**
 * Endpoints that don't require X-Tenant-Id header
 * These use JWT sub to identify the user/tenant on the backend
 */
const TENANT_HEADER_EXEMPT_PATHS = [
  '/api/v1/config/tenant',  // Bootstrap endpoint - uses JWT sub to find tenant
  '/config/tenant',         // Alternative path
  '/tenants/current',       // Legacy path
  '/tenants?',              // Tenant lookup by slug
];

/**
 * Check if a path is exempt from tenant header requirement
 */
const isTenantHeaderExempt = (path) => {
  return TENANT_HEADER_EXEMPT_PATHS.some(exempt => path.includes(exempt));
};

/**
 * Build headers with JWT token for API Gateway authentication
 *
 * IMPORTANT: tenantId comes from auth store (set during login/bootstrap)
 * This ensures all tenant-scoped API calls include the X-Tenant-Id header
 * for multi-tenant isolation on the backend.
 */
const buildHeaders = async (path = "") => {
  const { useAuthStore } = await import("@/stores/auth");

  const authState = useAuthStore.getState();
  const accessToken = authState.accessToken;
  // Get tenantId and accountCode from auth store
  const tenantId = authState.tenantId;
  const accountCode = authState.accountCode;

  // Check if this endpoint is exempt from tenant header requirement
  const isExempt = isTenantHeaderExempt(path);

  // Only warn if tenantId is missing for non-exempt endpoints
  // This prevents spam during bootstrap when tenant isn't loaded yet
  if (!tenantId && !isExempt) {
    console.warn("⚠️ WARNING: No tenant ID found. Tenant may not be loaded yet. Path:", path);
  }

  return {
    headers: {
      "Content-Type": "application/json",
      ...(accessToken && { "Authorization": `Bearer ${accessToken}` }),
      // Include both for backward compatibility - backend can use either
      ...(tenantId && { "X-Tenant-Id": tenantId }),
      ...(accountCode && { "X-Account-Code": accountCode }),
    },
    tenantId,
    accountCode,
  };
};

const get = async (path, { params } = {}) => {
  const url = buildUrl(path, params);
  const { headers, tenantId } = await buildHeaders(path);
  logRequest('GET', url, tenantId);
  const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  await ensureAuthorized(res);
  const data = await parseResponse(res);
  logResponse(res.status, data);
  if (!res.ok) {
    throw buildError(res, data);
  }
  return { data };
};

const post = async (path, body) => {
  const url = buildUrl(path);
  const { headers, tenantId } = await buildHeaders(path);
  logRequest('POST', url, tenantId);
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
  await ensureAuthorized(res);
  const data = await parseResponse(res);
  logResponse(res.status, data);
  if (!res.ok) {
    throw buildError(res, data);
  }
  return { data };
};

const put = async (path, body) => {
  const url = buildUrl(path);
  const { headers, tenantId } = await buildHeaders(path);
  logRequest('PUT', url, tenantId);
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body), credentials: 'include' });
  await ensureAuthorized(res);
  const data = await parseResponse(res);
  logResponse(res.status, data);
  if (!res.ok) {
    throw buildError(res, data);
  }
  return { data };
};

const patch = async (path, body) => {
  const url = buildUrl(path);
  const { headers, tenantId } = await buildHeaders(path);
  logRequest('PATCH', url, tenantId);
  const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body), credentials: 'include' });
  await ensureAuthorized(res);
  const data = await parseResponse(res);
  logResponse(res.status, data);
  if (!res.ok) {
    throw buildError(res, data);
  }
  return { data };
};

const del = async (path, options = {}) => {
  const url = buildUrl(path, options.params);
  const { headers, tenantId } = await buildHeaders(path);
  logRequest('DELETE', url, tenantId);
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    body: options?.data ? JSON.stringify(options.data) : undefined,
    credentials: 'include',
  });
  await ensureAuthorized(res);
  const data = await parseResponse(res);
  logResponse(res.status, data);
  if (!res.ok) {
    throw buildError(res, data);
  }
  if (res.status === 204) {
    return { data: null };
  }
  return { data };
};

// The main export is now an object containing the clients,
// but for backward compatibility, we can keep a default export if needed.
const apiClient = {
  auth,
  storage,
  uploadFile,
  uploadClient, // deprecated, use uploadFile instead
  get,
  post,
  put,
  patch,
  delete: del,
};

export { apiClient };
export default apiClient;
