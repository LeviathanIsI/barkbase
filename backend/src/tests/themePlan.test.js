const request = require('supertest');
const { parse } = require('cookie');
const app = require('../app');

const loginAs = async (tenantSlug, email, password = 'Passw0rd!') => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant', tenantSlug)
    .send({ email, password });

  expect(response.status).toBe(200);
  const cookies = response.headers['set-cookie'] || [];
  const jar = cookies.reduce((acc, value) => ({ ...acc, ...parse(value) }), {});
  return {
    token: response.body.tokens.accessToken,
    cookieHeader: cookies.join('; '),
    csrfToken: jar.csrfToken,
  };
};

describe('Tenant theme gating', () => {
  it('rejects theme updates for free plans', async () => {
    const session = await loginAs('globex', 'owner@globex.test');

    const response = await request(app)
      .put('/api/v1/tenants/current/theme')
      .set('X-Tenant', 'globex')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        colors: {
          primary: '255 0 0',
        },
      });

    expect(response.status).toBe(402);
    expect(response.body.message.toLowerCase()).toContain('theming');
  });
});
