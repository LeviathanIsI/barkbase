import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { enqueueRequest } from '@/lib/offlineQueue';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const shouldQueue = (error) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  return error instanceof TypeError;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const asJson = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const safeMsg = async (response) => {
  const fallback = `${response.status} ${response.statusText}`.trim();
  try {
    const payload = await asJson(response);
    if (!payload) {
      return fallback || 'Request failed';
    }
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload.message) {
      return payload.message;
    }
    return JSON.stringify(payload);
  } catch {
    return fallback || 'Request failed';
  }
};

const isTransientError = (error) => {
  if (!error) {
    return false;
  }
  if (error.name === 'AbortError') {
    return false;
  }
  return error.name === 'TypeError' || /Network/i.test(error.message ?? '');
};

const tryRefresh = async () => {
  const tenantSlug = useTenantStore.getState().tenant?.slug ?? 'default';
  const headers = new Headers();
  if (tenantSlug) {
    headers.set('X-Tenant', tenantSlug);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      return false;
    }

    const payload = await asJson(response);
    if (!payload?.accessToken) {
      return false;
    }

    useAuthStore.getState().updateTokens({ accessToken: payload.accessToken, role: payload.role });
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    return false;
  }
};

export const apiClient = async (path, options = {}) => {
  const {
    method = 'GET',
    body,
    headers = {},
    signal,
    ...rest
  } = options;

  const methodUpper = method?.toUpperCase?.() ?? method ?? 'GET';
  const authState = useAuthStore.getState();
  const tenantSlug = useTenantStore.getState().tenant?.slug ?? 'default';

  const tenantHeaders = tenantSlug ? { 'X-Tenant': tenantSlug } : {};
  const queueHeaders = { ...tenantHeaders, ...headers };

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isJsonPayload = body && typeof body === 'object' && !isFormData;
  const serializedBody = isJsonPayload ? JSON.stringify(body) : body ?? undefined;

  const finalHeaders = { ...queueHeaders };
  if (isJsonPayload && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (authState.accessToken) {
    finalHeaders.Authorization = `Bearer ${authState.accessToken}`;
  }

  const baseInit = {
    method,
    body: serializedBody,
    credentials: 'include',
    signal,
    ...rest,
  };

  const url = `${API_BASE_URL}${path}`;
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const init = {
      ...baseInit,
      headers: new Headers(finalHeaders),
    };

    try {
      const response = await fetch(url, init);

      if (response.status === 401) {
        const refreshed = await tryRefresh();
        if (!refreshed) {
          useAuthStore.getState().logout();
          throw new Error('Unauthorized');
        }

        const nextToken = useAuthStore.getState().accessToken;
        if (nextToken) {
          finalHeaders.Authorization = `Bearer ${nextToken}`;
        } else {
          delete finalHeaders.Authorization;
        }

        const retryResponse = await fetch(url, {
          ...baseInit,
          headers: new Headers(finalHeaders),
        });

        if (!retryResponse.ok) {
          throw new Error(await safeMsg(retryResponse));
        }

        return await asJson(retryResponse);
      }

      if (!response.ok) {
        throw new Error(await safeMsg(response));
      }

      return await asJson(response);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }

      lastError = error;
      if (isTransientError(error) && attempt < 2) {
        await wait(300 * (attempt + 1) ** 2);
        continue;
      }

      break;
    }
  }

  if (lastError && shouldQueue(lastError) && methodUpper !== 'GET') {
    const isBlobPayload = typeof Blob !== 'undefined' && body instanceof Blob;
    const canQueue = !(isFormData || isBlobPayload);
    if (canQueue) {
      await enqueueRequest({
        url: path,
        method,
        body,
        headers: queueHeaders,
      });
      return { queued: true };
    }
  }

  throw lastError ?? new Error('Request failed');
};

export const uploadClient = async (path, formData, options = {}) => {
  const token = useAuthStore.getState().accessToken;
  const tenantSlug = useTenantStore.getState().tenant?.slug ?? 'default';
  const tenantHeaders = tenantSlug ? { 'X-Tenant': tenantSlug } : {};
  const requestInit = {
    method: options.method ?? 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...tenantHeaders,
      ...options.headers,
    },
    credentials: 'include',
    signal: options.signal,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, requestInit);
  if (!response.ok) {
    throw new Error(await safeMsg(response));
  }

  return asJson(response);
};
