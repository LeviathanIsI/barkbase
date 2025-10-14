const request = require('supertest');
const prisma = require('../config/prisma');
const app = require('../app');

describe('Auth refresh flow', () => {
  const login = async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('X-Tenant', 'acme')
      .send({ email: 'owner@acme.test', password: 'Passw0rd!' });

    expect(res.status).toBe(200);
    return res;
  };

  it('issues a new access token when refresh token is valid', async () => {
    const loginResponse = await login();
    const cookies = loginResponse.headers['set-cookie'];

    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('X-Tenant', 'acme')
      .set('Cookie', cookies.join('; '));

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.accessToken).toBeDefined();
  });

  it('logs out when refresh token is invalidated', async () => {
    const loginResponse = await login();
    const cookies = loginResponse.headers['set-cookie'];

    const membership = await prisma.membership.findFirst({
      where: { tenantId: loginResponse.body.user.tenantId },
    });

    await prisma.membership.update({
      where: { recordId: membership.recordId },
      data: { refreshToken: 'revoked-token' },
    });

    const failedRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('X-Tenant', 'acme')
      .set('Cookie', cookies.join('; '));

    expect(failedRefresh.status).toBe(401);
  });
});
