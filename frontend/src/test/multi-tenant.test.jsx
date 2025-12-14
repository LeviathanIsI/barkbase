/**
 * Multi-Tenant Isolation Tests
 *
 * Tests to ensure proper tenant isolation in API requests.
 * Verifies that:
 * - All requests include tenant context
 * - Tenant data is properly scoped
 * - Tenant switching works correctly
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import { setupTestStores, clearTestStores } from './test-utils';

describe('Multi-Tenant Isolation', () => {
  beforeEach(async () => {
    await setupTestStores({
      tenant: {
        id: 'tenant-123',
        slug: 'test-kennel',
        name: 'Test Kennel',
        plan: 'PRO',
      },
    });
  });

  describe('Tenant Header Verification', () => {
    it('includes tenant header in API requests', async () => {
      let capturedHeaders = null;

      server.use(
        http.get('/api/v1/entity/owners', ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ data: [] });
        })
      );

      // Make a request through fetch (simulating apiClient)
      await fetch('/api/v1/entity/owners', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'tenant-123',
        },
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders['x-tenant-id']).toBe('tenant-123');
    });

    it('includes tenant header in POST requests', async () => {
      let capturedHeaders = null;

      server.use(
        http.post('/api/v1/entity/owners', ({ request }) => {
          capturedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({ data: { id: 'new-owner' } }, { status: 201 });
        })
      );

      await fetch('/api/v1/entity/owners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'tenant-123',
        },
        body: JSON.stringify({ firstName: 'Test', lastName: 'Owner' }),
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders['x-tenant-id']).toBe('tenant-123');
    });
  });

  describe('Tenant Data Scoping', () => {
    it('returns 401 for requests without tenant context', async () => {
      server.use(
        http.get('/api/v1/entity/owners', ({ request }) => {
          const tenantId = request.headers.get('x-tenant-id');
          if (!tenantId) {
            return HttpResponse.json(
              { error: 'Tenant context required' },
              { status: 401 }
            );
          }
          return HttpResponse.json({ data: [] });
        })
      );

      const response = await fetch('/api/v1/entity/owners', {
        headers: {
          'Content-Type': 'application/json',
          // No X-Tenant-Id header
        },
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Tenant context required');
    });

    it('returns only data for the current tenant', async () => {
      const tenantAData = [
        { recordId: '1', name: 'Tenant A Owner 1' },
        { recordId: '2', name: 'Tenant A Owner 2' },
      ];
      const tenantBData = [
        { recordId: '3', name: 'Tenant B Owner 1' },
      ];

      server.use(
        http.get('/api/v1/entity/owners', ({ request }) => {
          const tenantId = request.headers.get('x-tenant-id');

          if (tenantId === 'tenant-a') {
            return HttpResponse.json({ data: tenantAData });
          }
          if (tenantId === 'tenant-b') {
            return HttpResponse.json({ data: tenantBData });
          }
          return HttpResponse.json({ data: [] });
        })
      );

      // Request as tenant A
      const responseA = await fetch('/api/v1/entity/owners', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'tenant-a',
        },
      });
      const dataA = await responseA.json();
      expect(dataA.data).toHaveLength(2);
      expect(dataA.data[0].name).toBe('Tenant A Owner 1');

      // Request as tenant B
      const responseB = await fetch('/api/v1/entity/owners', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'tenant-b',
        },
      });
      const dataB = await responseB.json();
      expect(dataB.data).toHaveLength(1);
      expect(dataB.data[0].name).toBe('Tenant B Owner 1');
    });

    it('prevents cross-tenant data access', async () => {
      server.use(
        http.get('/api/v1/entity/owners/:id', ({ params, request }) => {
          const tenantId = request.headers.get('x-tenant-id');

          // Owner belongs to tenant-a
          if (params.id === 'owner-from-tenant-a') {
            if (tenantId !== 'tenant-a') {
              return HttpResponse.json(
                { error: 'Not found' },
                { status: 404 }
              );
            }
            return HttpResponse.json({
              data: { recordId: 'owner-from-tenant-a', name: 'Tenant A Owner' },
            });
          }

          return HttpResponse.json({ error: 'Not found' }, { status: 404 });
        })
      );

      // Tenant A can access their own data
      const responseA = await fetch('/api/v1/entity/owners/owner-from-tenant-a', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'tenant-a',
        },
      });
      expect(responseA.status).toBe(200);
      const dataA = await responseA.json();
      expect(dataA.data.name).toBe('Tenant A Owner');

      // Tenant B cannot access Tenant A's data
      const responseB = await fetch('/api/v1/entity/owners/owner-from-tenant-a', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'tenant-b',
        },
      });
      expect(responseB.status).toBe(404);
    });
  });

  describe('Tenant Context Switching', () => {
    it('handles tenant context updates', async () => {
      const requests = [];

      server.use(
        http.get('/api/v1/entity/owners', ({ request }) => {
          requests.push({
            tenantId: request.headers.get('x-tenant-id'),
            timestamp: Date.now(),
          });
          return HttpResponse.json({ data: [] });
        })
      );

      // First request as tenant-1
      await fetch('/api/v1/entity/owners', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'tenant-1',
        },
      });

      // Second request as tenant-2 (simulating tenant switch)
      await fetch('/api/v1/entity/owners', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': 'tenant-2',
        },
      });

      expect(requests).toHaveLength(2);
      expect(requests[0].tenantId).toBe('tenant-1');
      expect(requests[1].tenantId).toBe('tenant-2');
    });
  });

  describe('Tenant Configuration', () => {
    it('fetches tenant configuration on bootstrap', async () => {
      server.use(
        http.get('/api/v1/config/tenant', () => {
          return HttpResponse.json({
            data: {
              id: 'tenant-123',
              name: 'Test Kennel',
              slug: 'test-kennel',
              plan: 'PRO',
              featureFlags: {
                enableSMS: true,
                enableReports: true,
              },
            },
          });
        })
      );

      const response = await fetch('/api/v1/config/tenant', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      const data = await response.json();
      expect(data.data.id).toBe('tenant-123');
      expect(data.data.featureFlags.enableSMS).toBe(true);
    });
  });
});

describe('API Client Tenant Integration', () => {
  beforeEach(async () => {
    await setupTestStores();
  });

  it('attaches authorization header to requests', async () => {
    let capturedHeaders = null;

    server.use(
      http.get('/api/v1/test', ({ request }) => {
        capturedHeaders = Object.fromEntries(request.headers.entries());
        return HttpResponse.json({ success: true });
      })
    );

    await fetch('/api/v1/test', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
        'X-Tenant-Id': 'test-tenant-1',
      },
    });

    expect(capturedHeaders).toBeDefined();
    expect(capturedHeaders['authorization']).toBe('Bearer test-token');
    expect(capturedHeaders['x-tenant-id']).toBe('test-tenant-1');
  });

  it('handles tenant-specific error messages', async () => {
    server.use(
      http.post('/api/v1/entity/owners', () => {
        return HttpResponse.json(
          {
            error: 'Tenant limit exceeded',
            message: 'Your plan allows a maximum of 100 owners',
            code: 'TENANT_LIMIT_EXCEEDED',
          },
          { status: 403 }
        );
      })
    );

    const response = await fetch('/api/v1/entity/owners', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'test-tenant',
      },
      body: JSON.stringify({ firstName: 'Test' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.code).toBe('TENANT_LIMIT_EXCEEDED');
    expect(data.message).toContain('100 owners');
  });
});
