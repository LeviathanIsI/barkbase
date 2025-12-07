import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config/env to provide absolute URL for tests (required for URL() constructor in Node)
vi.mock('@/config/env', () => ({
  apiBaseUrl: 'http://localhost:3000/api',
  isDevelopment: true,
  isProduction: false,
  authMode: 'embedded',
  config: {
    apiBaseUrl: 'http://localhost:3000/api',
    isDevelopment: true,
    isProduction: false,
  },
}));

// Mock aws-client BEFORE importing apiClient
vi.mock('@/lib/aws-client', () => ({
  createAWSClient: vi.fn(() => ({
    auth: {},
    storage: {},
  })),
}));

vi.mock('@/lib/offlineQueue', () => ({
  enqueueRequest: vi.fn(),
}));

// Import after mocks are set up
import apiClient from '../apiClient';
import { useAuthStore } from '@/stores/auth';

describe('apiClient tenant headers', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Set up auth store with tenant info
    useAuthStore.setState({
      accessToken: 'test-token',
      tenantId: 'tenant-123',
      user: { id: 'user-1' },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve(''),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    useAuthStore.setState({
      accessToken: null,
      tenantId: null,
      user: null,
    });
    vi.restoreAllMocks();
  });

  it('sends X-Tenant-Id header with current tenant', async () => {
    await apiClient.get('/api/test');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers['X-Tenant-Id']).toBe('tenant-123');
  });

  it('sends Authorization header with access token', async () => {
    await apiClient.get('/api/test');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe('Bearer test-token');
  });

  it('omits X-Tenant-Id header when tenant missing', async () => {
    useAuthStore.setState({
      accessToken: 'test-token',
      tenantId: null,
      user: { id: 'user-1' },
    });

    await apiClient.get('/api/v1/config/tenant'); // exempt path

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers['X-Tenant-Id']).toBeUndefined();
  });

  it('includes Content-Type header for JSON requests', async () => {
    await apiClient.post('/api/test', { foo: 'bar' });

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers['Content-Type']).toBe('application/json');
  });

  it('supports GET with query params', async () => {
    await apiClient.get('/api/test', { params: { page: 1, limit: 10 } });

    const [url] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('page=1');
    expect(url).toContain('limit=10');
  });
});
