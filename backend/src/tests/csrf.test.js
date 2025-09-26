const request = require('supertest');
const { parse } = require('cookie');
const app = require('../app');
const prisma = require('../config/prisma');

const createLoginSession = async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Tenant', 'acme')
    .send({ email: 'owner@acme.test', password: 'Passw0rd!' });

  expect(res.status).toBe(200);
  const cookies = res.headers['set-cookie'] || [];
  const jar = cookies.reduce((acc, cookieStr) => {
    const parsed = parse(cookieStr);
    return { ...acc, ...parsed };
  }, {});

  return {
    accessToken: jar.accessToken,
    csrfToken: jar.csrfToken,
    cookieHeader: cookies.join('; '),
  };
};

describe('CSRF protection', () => {
  it('rejects unsafe requests without matching CSRF token', async () => {
    const session = await createLoginSession();

    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('X-Tenant', 'acme')
      .set('Cookie', session.cookieHeader)
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/CSRF/i);
  });

  it('allows unsafe requests with valid CSRF token', async () => {
    const session = await createLoginSession();

    const checkIn = new Date().toISOString();
    const checkOut = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const [pet] = await prisma.pet.findMany({ where: { tenantId: { not: undefined } }, include: { owners: true } });
    const kennel = await prisma.kennel.findFirst();

    const payload = {
      petId: pet?.id,
      ownerId: pet?.owners?.[0]?.ownerId,
      status: 'CONFIRMED',
      checkIn,
      checkOut,
      segments: [
        {
          kennelId: kennel?.id,
          startDate: checkIn,
          endDate: checkOut,
          status: 'CONFIRMED',
        },
      ],
      services: [],
    };

    const response = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('X-Tenant', 'acme')
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken)
      .send(payload);

    expect(response.status).toBe(201);
  });
});
