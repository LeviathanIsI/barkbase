const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const request = require('supertest');
const app = require('../app');
const env = require('../config/env');
const prisma = require('../config/prisma');

const loginAs = async (tenantSlug, email, password = 'Passw0rd!') => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant', tenantSlug)
    .send({ email, password });

  expect(response.status).toBe(200);
  const cookies = response.headers['set-cookie'] || [];
  const jar = cookies.reduce((acc, value) => {
    const [cookieKey, cookieValue] = value.split(';')[0].split('=');
    return { ...acc, [cookieKey]: cookieValue };
  }, {});

  return {
    token: response.body.tokens.accessToken,
    cookieHeader: cookies.join('; '),
    csrfToken: jar.csrfToken,
  };
};

describe('Tenant export endpoint', () => {
  let session;
  const tenantSlug = 'acme';
const exportDir = path.join(env.storage.root, 'tenants', tenantSlug, 'exports');

  beforeEach(async () => {
    await fsp.rm(exportDir, { recursive: true, force: true });
    session = await loginAs(tenantSlug, 'owner@acme.test');
  });

  it('creates a downloadable ZIP export and records the timestamp', async () => {
    const response = await request(app)
      .get('/api/v1/tenants/current/export')
      .set('X-Tenant', tenantSlug)
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/zip/);
    expect(response.headers['content-disposition']).toMatch(/attachment/);

    const files = fs.existsSync(exportDir) ? fs.readdirSync(exportDir) : [];
    expect(files.some((file) => file.endsWith('.zip'))).toBe(true);

    const tenantRecord = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { settings: true },
    });
    const lastGeneratedAt = tenantRecord.settings?.exports?.lastGeneratedAt;
    expect(typeof lastGeneratedAt).toBe('string');
    expect(Number.isNaN(new Date(lastGeneratedAt).getTime())).toBe(false);
  });
});
