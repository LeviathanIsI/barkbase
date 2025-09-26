const request = require('supertest');
const app = require('../app');
const loginAs = async (tenantSlug, email, password = 'Passw0rd!') => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant', tenantSlug)
    .send({ email, password });

  expect(response.status).toBe(200);
  return response.body;
};

describe('Tenant isolation', () => {
  it('prevents cross-tenant access', async () => {
    const login = await loginAs('acme', 'owner@acme.test');

    const res = await request(app)
      .get('/api/v1/pets')
      .set('X-Tenant', 'globex')
      .set('Authorization', `Bearer ${login.tokens.accessToken}`);

    expect(res.status).toBe(403);
  });

  it('allows access within same tenant', async () => {
    const login = await loginAs('acme', 'owner@acme.test');

    const res = await request(app)
      .get('/api/v1/pets')
      .set('X-Tenant', 'acme')
      .set('Authorization', `Bearer ${login.tokens.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
