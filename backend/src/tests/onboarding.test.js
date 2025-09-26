const request = require('supertest');
const { parse } = require('cookie');
const app = require('../app');
const prisma = require('../config/prisma');

const loginAs = async (tenantSlug, email, password = 'Passw0rd!') => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant', tenantSlug)
    .send({ email, password });

  if (response.status !== 200) {
    // eslint-disable-next-line no-console
    console.error('login failed', response.body);
  }

  expect(response.status).toBe(200);
  const cookies = response.headers['set-cookie'] || [];
  const jar = cookies.reduce((acc, value) => ({ ...acc, ...parse(value) }), {});
  return {
    token: response.body.tokens.accessToken,
    cookieHeader: cookies.join('; '),
    csrfToken: jar.csrfToken,
  };
};

describe('Tenant onboarding checklist', () => {
  it('returns computed checklist and plan summary for the current tenant', async () => {
    const session = await loginAs('acme', 'owner@acme.test');

    const response = await request(app)
      .get('/api/v1/tenants/current/onboarding')
      .set('X-Tenant', 'acme')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader);

    expect(response.status).toBe(200);
    expect(response.body.dismissed).toBe(false);
    expect(Array.isArray(response.body.checklist)).toBe(true);
    expect(response.body.checklist.length).toBeGreaterThan(0);

    const byId = Object.fromEntries(response.body.checklist.map((item) => [item.id, item]));

    expect(byId['add-pet'].done).toBe(true);
    expect(byId['configure-kennels'].done).toBe(true);
    expect(byId['review-plan'].done).toBe(true);
    expect(byId['create-booking'].done).toBe(false);
    expect(byId['invite-team'].done).toBe(false);
    expect(response.body.plan.name).toBe('PRO');
    expect(response.body.plan.features.billingPortal).toBe(true);

    expect(response.body.progress.completed).toBeGreaterThanOrEqual(3);
    expect(response.body.progress.total).toBe(response.body.checklist.length);
  });

  it('persists dismissal toggles in tenant settings', async () => {
    const session = await loginAs('acme', 'owner@acme.test');

    const updateResponse = await request(app)
      .patch('/api/v1/tenants/current/onboarding')
      .set('X-Tenant', 'acme')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ dismissed: true });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.dismissed).toBe(true);

    const settings = await prisma.tenant.findUnique({ where: { slug: 'acme' }, select: { settings: true } });
    expect(settings.settings?.onboarding?.dismissed).toBe(true);

    const followUp = await request(app)
      .get('/api/v1/tenants/current/onboarding')
      .set('X-Tenant', 'acme')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader);

    expect(followUp.status).toBe(200);
    expect(followUp.body.dismissed).toBe(true);
  });
});
