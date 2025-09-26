const request = require('supertest');
const app = require('../app');
const prisma = require('../config/prisma');

const login = async (tenantSlug, email) => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant', tenantSlug)
    .send({ email, password: 'Passw0rd!' });

  expect(res.status).toBe(200);
  return res.body.tokens.accessToken;
};

describe('Tenant isolation - bookings', () => {
  it('prevents ACME user from reading bookings under Globex', async () => {
    const token = await login('acme', 'owner@acme.test');

    const response = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant', 'globex');

    expect([403, 404]).toContain(response.status);
  });

  it('returns bookings for same-tenant requests', async () => {
    const token = await login('acme', 'owner@acme.test');

    const response = await request(app)
      .get('/api/v1/bookings')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant', 'acme');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('ensures newly seeded records carry tenantId', async () => {
    const models = [
      prisma.booking.findMany({}),
      prisma.pet.findMany({}),
      prisma.kennel.findMany({}),
      prisma.payment.findMany({}),
    ];

    const [bookings, pets, kennels, payments] = await Promise.all(models);

    [...bookings, ...pets, ...kennels, ...payments].forEach((record) => {
      expect(record.tenantId).toBeDefined();
      expect(record.tenantId).not.toBeNull();
    });
  });
});
