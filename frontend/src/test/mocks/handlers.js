/**
 * MSW API Mock Handlers
 *
 * Mock API endpoints for testing. These handlers intercept HTTP requests
 * and return mock responses, allowing tests to run without a real backend.
 */

import { http, HttpResponse } from 'msw';
import {
  createOwners,
  createPets,
  createBookings,
  createPayments,
  createKennels,
  createInvoices,
  createVaccinations,
  createStaffMembers,
  createTenant,
} from '../factories';

const API_BASE = '/api/v1';

// Store mock data that can be manipulated in tests
export const mockData = {
  owners: createOwners(10),
  pets: createPets(15),
  bookings: createBookings(20),
  payments: createPayments(5),
  kennels: createKennels(10),
  invoices: createInvoices(5),
  vaccinations: createVaccinations(20),
  staff: createStaffMembers(5),
  tenant: createTenant(),
};

/**
 * Reset mock data to initial state
 * Call this in afterEach to ensure clean state between tests
 */
export const resetMockData = () => {
  mockData.owners = createOwners(10);
  mockData.pets = createPets(15);
  mockData.bookings = createBookings(20);
  mockData.payments = createPayments(5);
  mockData.kennels = createKennels(10);
  mockData.invoices = createInvoices(5);
  mockData.vaccinations = createVaccinations(20);
  mockData.staff = createStaffMembers(5);
  mockData.tenant = createTenant();
};

/**
 * Helper to simulate network delay
 */
const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * MSW Handlers
 */
export const handlers = [
  // ============================================================================
  // OWNERS
  // ============================================================================
  http.get(`${API_BASE}/entity/owners`, async () => {
    await delay();
    return HttpResponse.json({ data: mockData.owners, owners: mockData.owners });
  }),

  http.get(`${API_BASE}/entity/owners/:id`, async ({ params }) => {
    await delay();
    const owner = mockData.owners.find(
      (o) => o.recordId === params.id || o.id === params.id
    );
    if (!owner) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: owner });
  }),

  http.post(`${API_BASE}/entity/owners`, async ({ request }) => {
    await delay();
    const body = await request.json();
    const newOwner = {
      ...body,
      recordId: `new-${Date.now()}`,
      id: `new-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockData.owners.push(newOwner);
    return HttpResponse.json({ data: newOwner }, { status: 201 });
  }),

  http.put(`${API_BASE}/entity/owners/:id`, async ({ params, request }) => {
    await delay();
    const body = await request.json();
    const index = mockData.owners.findIndex(
      (o) => o.recordId === params.id || o.id === params.id
    );
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    mockData.owners[index] = {
      ...mockData.owners[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ data: mockData.owners[index] });
  }),

  http.delete(`${API_BASE}/entity/owners/:id`, async ({ params }) => {
    await delay();
    const index = mockData.owners.findIndex(
      (o) => o.recordId === params.id || o.id === params.id
    );
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    mockData.owners.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // ============================================================================
  // PETS
  // ============================================================================
  http.get(`${API_BASE}/entity/pets`, async () => {
    await delay();
    return HttpResponse.json({ data: mockData.pets, pets: mockData.pets });
  }),

  http.get(`${API_BASE}/entity/pets/:id`, async ({ params }) => {
    await delay();
    const pet = mockData.pets.find(
      (p) => p.recordId === params.id || p.id === params.id
    );
    if (!pet) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: pet });
  }),

  http.post(`${API_BASE}/entity/pets`, async ({ request }) => {
    await delay();
    const body = await request.json();
    const newPet = {
      ...body,
      recordId: `new-${Date.now()}`,
      id: `new-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockData.pets.push(newPet);
    return HttpResponse.json({ data: newPet }, { status: 201 });
  }),

  http.put(`${API_BASE}/entity/pets/:id`, async ({ params, request }) => {
    await delay();
    const body = await request.json();
    const index = mockData.pets.findIndex(
      (p) => p.recordId === params.id || p.id === params.id
    );
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    mockData.pets[index] = {
      ...mockData.pets[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ data: mockData.pets[index] });
  }),

  http.delete(`${API_BASE}/entity/pets/:id`, async ({ params }) => {
    await delay();
    const index = mockData.pets.findIndex(
      (p) => p.recordId === params.id || p.id === params.id
    );
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    mockData.pets.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // ============================================================================
  // BOOKINGS
  // ============================================================================
  http.get(`${API_BASE}/operations/bookings`, async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let filtered = mockData.bookings;

    if (status) {
      filtered = filtered.filter((b) => b.status === status);
    }

    if (startDate && endDate) {
      filtered = filtered.filter((b) => {
        const checkIn = new Date(b.checkIn);
        return checkIn >= new Date(startDate) && checkIn <= new Date(endDate);
      });
    }

    return HttpResponse.json({ data: filtered, bookings: filtered });
  }),

  http.get(`${API_BASE}/operations/bookings/:id`, async ({ params }) => {
    await delay();
    const booking = mockData.bookings.find(
      (b) => b.recordId === params.id || b.id === params.id
    );
    if (!booking) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: booking });
  }),

  http.post(`${API_BASE}/operations/bookings`, async ({ request }) => {
    await delay();
    const body = await request.json();

    // Validate check-in/check-out dates
    const checkIn = new Date(body.checkIn);
    const checkOut = new Date(body.checkOut);

    if (checkIn < new Date()) {
      return HttpResponse.json(
        { error: 'Validation failed', details: ['checkIn cannot be in the past'] },
        { status: 400 }
      );
    }

    if (checkOut <= checkIn) {
      return HttpResponse.json(
        { error: 'Validation failed', details: ['checkOut must be after checkIn'] },
        { status: 400 }
      );
    }

    const newBooking = {
      ...body,
      recordId: `new-${Date.now()}`,
      id: `new-${Date.now()}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockData.bookings.push(newBooking);
    return HttpResponse.json({ data: newBooking }, { status: 201 });
  }),

  http.post(`${API_BASE}/operations/bookings/:id/check-in`, async ({ params }) => {
    await delay();
    const index = mockData.bookings.findIndex(
      (b) => b.recordId === params.id || b.id === params.id
    );
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (mockData.bookings[index].status !== 'CONFIRMED') {
      return HttpResponse.json(
        { error: 'Can only check in confirmed bookings' },
        { status: 400 }
      );
    }

    mockData.bookings[index] = {
      ...mockData.bookings[index],
      status: 'CHECKED_IN',
      checkedInAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ data: mockData.bookings[index] });
  }),

  http.post(`${API_BASE}/operations/bookings/:id/check-out`, async ({ params }) => {
    await delay();
    const index = mockData.bookings.findIndex(
      (b) => b.recordId === params.id || b.id === params.id
    );
    if (index === -1) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (mockData.bookings[index].status !== 'CHECKED_IN') {
      return HttpResponse.json(
        { error: 'Can only check out checked-in bookings' },
        { status: 400 }
      );
    }

    mockData.bookings[index] = {
      ...mockData.bookings[index],
      status: 'CHECKED_OUT',
      checkedOutAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ data: mockData.bookings[index] });
  }),

  // ============================================================================
  // PAYMENTS
  // ============================================================================
  http.get(`${API_BASE}/financial/payments`, async () => {
    await delay();
    return HttpResponse.json({
      data: mockData.payments,
      payments: mockData.payments,
      items: mockData.payments,
    });
  }),

  http.post(`${API_BASE}/financial/payments`, async ({ request }) => {
    await delay();
    const body = await request.json();

    // Validate amount
    if (!body.amount || body.amount <= 0) {
      return HttpResponse.json(
        { error: 'Validation failed', details: ['amount must be greater than 0'] },
        { status: 400 }
      );
    }

    // Check idempotency
    if (body.idempotencyKey) {
      const existing = mockData.payments.find(
        (p) => p.idempotencyKey === body.idempotencyKey
      );
      if (existing) {
        return HttpResponse.json({ data: existing, idempotent: true });
      }
    }

    const newPayment = {
      ...body,
      recordId: `pay-${Date.now()}`,
      id: `pay-${Date.now()}`,
      status: 'COMPLETED',
      transactionId: `txn-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockData.payments.push(newPayment);
    return HttpResponse.json({ data: newPayment }, { status: 201 });
  }),

  // ============================================================================
  // INVOICES
  // ============================================================================
  http.get(`${API_BASE}/financial/invoices`, async () => {
    await delay();
    return HttpResponse.json({ data: mockData.invoices, invoices: mockData.invoices });
  }),

  http.get(`${API_BASE}/financial/invoices/:id`, async ({ params }) => {
    await delay();
    const invoice = mockData.invoices.find(
      (i) => i.recordId === params.id || i.id === params.id
    );
    if (!invoice) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: invoice });
  }),

  // ============================================================================
  // KENNELS
  // ============================================================================
  http.get(`${API_BASE}/facility/kennels`, async () => {
    await delay();
    return HttpResponse.json({ data: mockData.kennels, kennels: mockData.kennels });
  }),

  http.get(`${API_BASE}/facility/kennels/:id`, async ({ params }) => {
    await delay();
    const kennel = mockData.kennels.find(
      (k) => k.recordId === params.id || k.id === params.id
    );
    if (!kennel) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ data: kennel });
  }),

  // ============================================================================
  // STAFF
  // ============================================================================
  http.get(`${API_BASE}/entity/staff`, async () => {
    await delay();
    return HttpResponse.json({ data: mockData.staff, staff: mockData.staff });
  }),

  // ============================================================================
  // VACCINATIONS
  // ============================================================================
  http.get(`${API_BASE}/entity/vaccinations`, async () => {
    await delay();
    return HttpResponse.json({
      data: mockData.vaccinations,
      vaccinations: mockData.vaccinations,
    });
  }),

  // ============================================================================
  // TENANT / CONFIG
  // ============================================================================
  http.get(`${API_BASE}/config/tenant`, async () => {
    await delay();
    return HttpResponse.json({ data: mockData.tenant });
  }),

  http.get(`${API_BASE}/tenant`, async () => {
    await delay();
    return HttpResponse.json({
      data: {
        id: 'test-tenant',
        name: 'Test Kennel',
        slug: 'test',
        isActive: true,
      },
    });
  }),

  // ============================================================================
  // AUTH
  // ============================================================================
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    await delay();
    const body = await request.json();

    // Mock invalid credentials
    if (body.email === 'wrong@example.com' || body.password === 'wrongpassword') {
      return HttpResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      token: 'test-jwt-token',
      refreshToken: 'test-refresh-token',
      user: {
        id: 'user-1',
        email: body.email,
        firstName: 'Test',
        lastName: 'User',
        role: 'OWNER',
      },
      tenant: mockData.tenant,
    });
  }),

  http.post(`${API_BASE}/auth/refresh`, async () => {
    await delay();
    return HttpResponse.json({
      token: 'new-jwt-token',
      refreshToken: 'new-refresh-token',
    });
  }),

  http.post(`${API_BASE}/auth/logout`, async () => {
    await delay();
    return HttpResponse.json({ success: true });
  }),

  // ============================================================================
  // CALENDAR / SCHEDULE
  // ============================================================================
  http.get(`${API_BASE}/calendar/events`, async () => {
    await delay();
    return HttpResponse.json({ events: [] });
  }),

  http.get(`${API_BASE}/operations/schedules`, async () => {
    await delay();
    return HttpResponse.json({ data: [] });
  }),

  // ============================================================================
  // PAYMENT SUMMARY (for dashboard)
  // ============================================================================
  http.get(`${API_BASE}/financial/payments/summary`, async () => {
    await delay();
    const totalCapturedCents = mockData.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + (p.amountCents || 0), 0);

    return HttpResponse.json({
      data: {
        byStatus: [
          { status: 'COMPLETED', count: mockData.payments.filter((p) => p.status === 'COMPLETED').length },
          { status: 'PENDING', count: mockData.payments.filter((p) => p.status === 'PENDING').length },
        ],
        totalCapturedCents,
      },
    });
  }),
];

/**
 * Error handler factory
 * Use this to temporarily override handlers with error responses
 */
export const createErrorHandler = (method, path, statusCode, error) => {
  return http[method](`${API_BASE}${path}`, async () => {
    await delay();
    return HttpResponse.json({ error }, { status: statusCode });
  });
};

/**
 * Network error handler factory
 */
export const createNetworkErrorHandler = (method, path) => {
  return http[method](`${API_BASE}${path}`, () => {
    return HttpResponse.error();
  });
};
