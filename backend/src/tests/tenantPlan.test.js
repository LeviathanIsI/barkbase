const request = require('supertest');
const app = require('../app');

describe('Tenant plan endpoint', () => {
  it('returns plan and merged features for current tenant', async () => {
    const response = await request(app)
      .get('/api/v1/tenants/current/plan')
      .set('X-Tenant', 'acme');

    expect(response.status).toBe(200);
    expect(response.body.plan).toBe('PRO');
    expect(response.body.features).toBeDefined();
    expect(response.body.features.billingPortal).toBe(true);
    expect(response.body.features.auditLog).toBe(true);
  });

  it('respects tenant overrides when returning features', async () => {
    const response = await request(app)
      .get('/api/v1/tenants/current/plan')
      .set('X-Tenant', 'globex');

    expect(response.status).toBe(200);
    expect(response.body.plan).toBe('FREE');
    expect(response.body.features.billingPortal).toBe(false);
  });
});
