const request = require('supertest');
const prisma = require('../config/prisma');
const env = require('../config/env');
const mailer = require('../lib/mailer');
const app = require('../app');

describe('Public signup and verification', () => {
  afterEach(() => {
    env.email.provider = 'json';
    jest.restoreAllMocks();
  });

  it('auto-verifies signups when email provider does not require SMTP', async () => {
    const slug = `test-kennels-${Date.now()}`;
    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        tenantName: 'Test Kennels',
        tenantSlug: slug,
        email: `founder+${Date.now()}@testkennels.dev`,
        password: 'SuperSafePass123!',
      });

    expect(response.status).toBe(201);
    expect(response.body?.tenant?.slug).toBe(slug);
    expect(response.body?.tokens?.accessToken).toEqual(expect.any(String));

    const setCookie = response.headers['set-cookie'] ?? [];
    expect(setCookie).toEqual(expect.arrayContaining([expect.stringContaining('accessToken=')]));
    expect(setCookie).toEqual(expect.arrayContaining([expect.stringContaining('refreshToken=')]));

    const user = await prisma.user.findUnique({ where: { email: response.body.user.email } });
    expect(user.emailVerified).toBe(true);

    const tokenRecord = await prisma.emailVerificationToken.findFirst({ where: { userId: user.id } });
    expect(tokenRecord).toBeNull();
  });

  it('rejects duplicate tenant slugs', async () => {
    const first = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        tenantName: 'Unique Co',
        tenantSlug: 'unique-co',
        email: 'owner@uniqueco.dev',
        password: 'UniquePass123!',
      });

    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        tenantName: 'Duplicate Co',
        tenantSlug: 'unique-co',
        email: 'another@uniqueco.dev',
        password: 'AnotherPass123!',
      });

    expect(duplicate.status).toBe(409);
  });

  it('provides a verification token when SMTP delivery succeeds', async () => {
    env.email.provider = 'smtp';
    const sendMailMock = jest.spyOn(mailer, 'sendMail').mockResolvedValue({});

    const response = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        tenantName: 'SMTP Co',
        tenantSlug: 'smtp-co',
        email: 'owner@smtpco.dev',
        password: 'VerifyPass123!',
      });

    expect(response.status).toBe(201);
    expect(sendMailMock).toHaveBeenCalled();
    expect(response.body?.verification?.token).toEqual(expect.any(String));

    const setCookie = response.headers['set-cookie'] ?? [];
    expect(setCookie).toEqual(expect.not.arrayContaining([expect.stringContaining('accessToken=')]));

    const user = await prisma.user.findUnique({ where: { email: 'owner@smtpco.dev' } });
    expect(user.emailVerified).toBe(false);
  });

  it('verifies email tokens for SMTP signups', async () => {
    env.email.provider = 'smtp';
    jest.spyOn(mailer, 'sendMail').mockResolvedValue({});

    const signupResponse = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        tenantName: 'Verify Co',
        tenantSlug: 'verify-co',
        email: 'owner@verifyco.dev',
        password: 'VerifyPass123!',
      });

    const token = signupResponse.body?.verification?.token;
    expect(token).toEqual(expect.any(String));

    const verifyResponse = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.tokens.accessToken).toBeDefined();

    const setCookie = verifyResponse.headers['set-cookie'] ?? [];
    expect(setCookie).toEqual(expect.arrayContaining([expect.stringContaining('accessToken=')]));

    const updatedUser = await prisma.user.findUnique({ where: { email: 'owner@verifyco.dev' } });
    expect(updatedUser.emailVerified).toBe(true);
  });
});
