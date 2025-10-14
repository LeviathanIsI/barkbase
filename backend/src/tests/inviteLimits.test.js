const request = require('supertest');
const { parse } = require('cookie');
const app = require('../app');
const prisma = require('../config/prisma');
const { tenantContext } = require('../middleware/tenantContext');

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

describe('Invite limits', () => {
  let session;
  let tenant;

  beforeEach(async () => {
    session = await loginAs('acme', 'owner@acme.test');
    tenant = await prisma.tenant.findUnique({ where: { slug: 'acme' } });
  });

  const invite = (overrides = {}) =>
    request(app)
      .post(`/api/v1/tenants/${tenant.recordId}/invites`)
      .set('X-Tenant', 'acme')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        email: `staff-${Date.now()}@example.com`,
        role: 'STAFF',
        ...overrides,
      });

  it('blocks invites when seat capacity is exhausted', async () => {
    await prisma.tenant.update({
      where: { recordId: tenant.recordId },
      data: {
        featureFlags: {
          ...(tenant.featureFlags ?? {}),
          seats: 1,
        },
      },
    });
    if (typeof tenantContext.clearCache === 'function') {
      tenantContext.clearCache();
    }

    const response = await invite();
    expect(response.status).toBe(402);
    expect(response.body.message).toMatch(/seat/i);
  });

  it('blocks invites when monthly invite allowance is exceeded', async () => {
    await prisma.tenant.update({
      where: { recordId: tenant.recordId },
      data: {
        featureFlags: {
          ...(tenant.featureFlags ?? {}),
          invitesPerMonth: 1,
        },
      },
    });
    if (typeof tenantContext.clearCache === 'function') {
      tenantContext.clearCache();
    }

    const first = await invite({ email: 'team-one@example.com' });
    expect(first.status).toBe(201);

    const second = await invite({ email: 'team-two@example.com' });
    expect(second.status).toBe(402);
    expect(second.body.message).toMatch(/invite/i);
  });
});
