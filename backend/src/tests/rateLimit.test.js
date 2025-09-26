const request = require('supertest');
const { parse } = require('cookie');
const prisma = require('../config/prisma');
const app = require('../app');

const login = async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant', 'acme')
    .send({ email: 'owner@acme.test', password: 'Passw0rd!' });

  expect(res.status).toBe(200);
  const cookies = res.headers['set-cookie'] || [];
  const jar = cookies.reduce((acc, cookieStr) => ({ ...acc, ...parse(cookieStr) }), {});
  return {
    accessToken: jar.accessToken,
    cookieHeader: cookies.join('; '),
    csrfToken: jar.csrfToken,
  };
};

describe('Rate limiting', () => {
  it('limits booking writes per tenant', async () => {
    const session = await login();
    const pet = await prisma.pet.findFirst({ include: { owners: true } });
    const kennel = await prisma.kennel.findFirst();

    const payload = () => {
      const now = Date.now();
      return {
        petId: pet.id,
        ownerId: pet.owners[0].ownerId,
        status: 'CONFIRMED',
        checkIn: new Date(now + Math.random() * 1000).toISOString(),
        checkOut: new Date(now + 60 * 60 * 1000 + Math.random() * 1000).toISOString(),
        segments: [
          {
            kennelId: kennel.id,
            startDate: new Date(now + Math.random() * 1000).toISOString(),
            endDate: new Date(now + 60 * 60 * 1000 + Math.random() * 1000).toISOString(),
            status: 'CONFIRMED',
          },
        ],
        services: [],
      };
    };

    for (let i = 0; i < 60; i += 1) {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .set('X-Tenant', 'acme')
        .set('Cookie', session.cookieHeader)
        .set('X-CSRF-Token', session.csrfToken)
        .send(payload());

      expect(res.status).toBe(201);
    }

    const res61 = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('X-Tenant', 'acme')
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken)
      .send(payload());

    expect(res61.status).toBe(429);
    expect(res61.headers).toHaveProperty('retry-after');
  });

  it('limits login attempts per IP', async () => {
    const attempts = 11;
    let lastStatus = 200;

    for (let i = 0; i < attempts; i += 1) {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('X-Tenant', 'acme')
        .send({ email: 'owner@acme.test', password: 'WrongPass!' });
      lastStatus = res.status;
      if (i < 10) {
        expect([401, 429]).toContain(res.status);
      }
    }

    expect(lastStatus).toBe(429);
  });
});
