const request = require('supertest');
const { addDays } = require('date-fns');
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
  const jar = cookies.reduce((acc, str) => ({ ...acc, ...parse(str) }), {});
  return {
    token: response.body.tokens.accessToken,
    cookieHeader: cookies.join('; '),
    csrfToken: jar.csrfToken,
  };
};

describe('Booking CRUD', () => {
  let session;
  let tenant;
  let pet;
  let owner;
  let kennel;

  beforeEach(async () => {
    session = await loginAs('acme', 'owner@acme.test');
    tenant = await prisma.tenant.findUnique({ where: { slug: 'acme' } });
    pet = await prisma.pet.findFirst({ where: { tenantId: tenant.id } });
    owner = await prisma.owner.findFirst({ where: { tenantId: tenant.id } });
    kennel = await prisma.kennel.findFirst({ where: { tenantId: tenant.id } });
  });

  it('creates, updates, and deletes a booking', async () => {
    const checkIn = new Date();
    const checkOut = addDays(checkIn, 1);

    const createResponse = await request(app)
      .post('/api/v1/bookings')
      .set('X-Tenant', 'acme')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        petId: pet.id,
        ownerId: owner.id,
        status: 'CONFIRMED',
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        segments: [
          {
            kennelId: kennel.id,
            startDate: checkIn.toISOString(),
            endDate: checkOut.toISOString(),
            status: 'CONFIRMED',
          },
        ],
        services: [],
      });

    expect(createResponse.status).toBe(201);
    const bookingId = createResponse.body.id;

    const updateResponse = await request(app)
      .put(`/api/v1/bookings/${bookingId}`)
      .set('X-Tenant', 'acme')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        status: 'CANCELLED',
        segments: [
          {
            kennelId: kennel.id,
            startDate: checkIn.toISOString(),
            endDate: checkOut.toISOString(),
            status: 'CANCELLED',
          },
        ],
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.status).toBe('CANCELLED');

    const deleteResponse = await request(app)
      .delete(`/api/v1/bookings/${bookingId}`)
      .set('X-Tenant', 'acme')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken);

    expect(deleteResponse.status).toBe(204);

    const exists = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(exists).toBeNull();
  });

  it('forbids booking creation on another tenant', async () => {
    const checkIn = new Date();
    const checkOut = addDays(checkIn, 1);

    const response = await request(app)
      .post('/api/v1/bookings')
      .set('X-Tenant', 'globex')
      .set('Authorization', `Bearer ${session.token}`)
      .set('Cookie', session.cookieHeader)
      .set('X-CSRF-Token', session.csrfToken)
      .send({
        petId: pet.id,
        ownerId: owner.id,
        status: 'CONFIRMED',
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        segments: [
          {
            kennelId: kennel.id,
            startDate: checkIn.toISOString(),
            endDate: checkOut.toISOString(),
            status: 'CONFIRMED',
          },
        ],
        services: [],
      });

    expect(response.status).toBe(403);
  });
});
