import { createAWSClient } from './aws-client';

// 1. Initialize the AWS client with configuration from environment variables.
// The VITE_ prefix is used here, adjust if your framework is different (e.g., NEXT_PUBLIC_, REACT_APP_).
const awsClient = createAWSClient({
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
  clientId: import.meta.env.VITE_CLIENT_ID || '',
  // Provide a safe development default so data hooks don't crash when env isn't set
  apiUrl: import.meta.env.VITE_API_URL || '/api',
  // Hosted UI (PKCE) config
  cognitoDomain: import.meta.env.VITE_COGNITO_DOMAIN || '',
  redirectUri: import.meta.env.VITE_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : ''),
  logoutUri: import.meta.env.VITE_LOGOUT_URI || (typeof window !== 'undefined' ? window.location.origin : ''),
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

const ensureAuthorized = async (response) => {
  if (response?.status !== 401) {
    return;
  }

  await triggerAutoLogout();
  throw new Error('Unauthorized');
};

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

// Build headers with JWT token for API Gateway authentication
const buildHeaders = async (path = "") => {
  const { useTenantStore } = await import("@/stores/tenant");
  const { useAuthStore } = await import("@/stores/auth");

  const tenant = useTenantStore.getState().tenant;
  const tenantId = tenant?.recordId;
  const accessToken = useAuthStore.getState().accessToken;

  // Skip tenant check for tenant fetch endpoints (chicken-and-egg problem)
  const isTenantFetchEndpoint = path.includes("/tenants/current") || path.includes("/tenants?");

  if (!tenantId && !isTenantFetchEndpoint) {
    console.warn("⚠️ WARNING: No tenant ID found. Tenant may not be loaded yet.");
  }

  return {
    "Content-Type": "application/json",
    // Include Authorization header for API Gateway JWT authorizer
    ...(accessToken && { "Authorization": `Bearer ${accessToken}` }),
    ...(tenantId && { "X-Tenant-Id": tenantId }),
  };
};

const get = async (path, { params } = {}) => {
  const url = buildUrl(path, params);
  const headers = await buildHeaders(path);
  // SECURITY: Include credentials to send httpOnly cookies
  const res = await fetch(url, { method: 'GET', headers, credentials: 'include' });
  await ensureAuthorized(res);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('API Error:', res.status, errorText); // Debug log
    throw new Error(errorText);
  }
  return { data: await res.json() };
};

const post = async (path, body) => {
  const url = buildUrl(path);
  const headers = await buildHeaders(path);
  // SECURITY: Include credentials to send httpOnly cookies
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), credentials: 'include' });
  await ensureAuthorized(res);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return { data: await res.json() };
};

const put = async (path, body) => {
  const url = buildUrl(path);
  const headers = await buildHeaders(path);
  // SECURITY: Include credentials to send httpOnly cookies
  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body), credentials: 'include' });
  await ensureAuthorized(res);
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return { data: await res.json() };
};

const del = async (path, options = {}) => {
  const url = buildUrl(path, options.params);
  const headers = await buildHeaders(path);
  // SECURITY: Include credentials to send httpOnly cookies
  const res = await fetch(url, {
    method: 'DELETE',
    headers,
    body: options?.data ? JSON.stringify(options.data) : undefined,
    credentials: 'include',
  });
  await ensureAuthorized(res);
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
