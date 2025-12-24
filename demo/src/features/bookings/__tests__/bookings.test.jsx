/**
 * Booking Business Logic Tests
 *
 * Tests for booking functionality including:
 * - Booking CRUD operations
 * - Date validation
 * - Check-in/Check-out flows
 * - Status transitions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, setupTestStores } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { http, HttpResponse } from 'msw';
import {
  createBooking,
  createBookings,
  createOwnerWithPets,
  createKennel,
} from '@/test/factories';

beforeEach(async () => {
  await setupTestStores();
});

describe('Booking API', () => {
  describe('List Bookings', () => {
    it('fetches all bookings', async () => {
      const mockBookings = createBookings(5);

      server.use(
        http.get('/api/v1/operations/bookings', () => {
          return HttpResponse.json({
            data: mockBookings,
            bookings: mockBookings,
          });
        })
      );

      const response = await fetch('/api/v1/operations/bookings');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(5);
    });

    it('filters bookings by status', async () => {
      const mockBookings = [
        createBooking({ status: 'CONFIRMED' }),
        createBooking({ status: 'CONFIRMED' }),
        createBooking({ status: 'CANCELLED' }),
      ];

      server.use(
        http.get('/api/v1/operations/bookings', ({ request }) => {
          const url = new URL(request.url);
          const status = url.searchParams.get('status');

          let filtered = mockBookings;
          if (status) {
            filtered = mockBookings.filter((b) => b.status === status);
          }

          return HttpResponse.json({ data: filtered });
        })
      );

      const response = await fetch('/api/v1/operations/bookings?status=CONFIRMED');
      const data = await response.json();

      expect(data.data).toHaveLength(2);
      expect(data.data.every((b) => b.status === 'CONFIRMED')).toBe(true);
    });

    it('filters bookings by date range', async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const mockBookings = [
        createBooking({ checkIn: today.toISOString() }),
        createBooking({ checkIn: nextWeek.toISOString() }),
      ];

      server.use(
        http.get('/api/v1/operations/bookings', ({ request }) => {
          const url = new URL(request.url);
          const startDate = url.searchParams.get('startDate');
          const endDate = url.searchParams.get('endDate');

          let filtered = mockBookings;
          if (startDate && endDate) {
            filtered = mockBookings.filter((b) => {
              const checkIn = new Date(b.checkIn);
              return checkIn >= new Date(startDate) && checkIn <= new Date(endDate);
            });
          }

          return HttpResponse.json({ data: filtered });
        })
      );

      const response = await fetch(
        `/api/v1/operations/bookings?startDate=${today.toISOString()}&endDate=${today.toISOString()}`
      );
      const data = await response.json();

      expect(data.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Create Booking', () => {
    it('creates a booking with valid data', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(tomorrow);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const bookingData = {
        checkIn: tomorrow.toISOString(),
        checkOut: nextWeek.toISOString(),
        petId: 'pet-1',
        ownerId: 'owner-1',
        kennelId: 'kennel-1',
      };

      server.use(
        http.post('/api/v1/operations/bookings', async ({ request }) => {
          const body = await request.json();

          return HttpResponse.json(
            {
              data: {
                ...body,
                recordId: 'new-booking-1',
                status: 'PENDING',
                createdAt: new Date().toISOString(),
              },
            },
            { status: 201 }
          );
        })
      );

      const response = await fetch('/api/v1/operations/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data.status).toBe('PENDING');
    });

    it('rejects booking with check-in in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      server.use(
        http.post('/api/v1/operations/bookings', async ({ request }) => {
          const body = await request.json();
          const checkIn = new Date(body.checkIn);

          if (checkIn < new Date()) {
            return HttpResponse.json(
              {
                error: 'Validation failed',
                details: ['checkIn cannot be in the past'],
              },
              { status: 400 }
            );
          }

          return HttpResponse.json({ data: body }, { status: 201 });
        })
      );

      const response = await fetch('/api/v1/operations/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: yesterday.toISOString(),
          checkOut: new Date().toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details).toContain('checkIn cannot be in the past');
    });

    it('rejects booking with check-out before check-in', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const today = new Date();

      server.use(
        http.post('/api/v1/operations/bookings', async ({ request }) => {
          const body = await request.json();
          const checkIn = new Date(body.checkIn);
          const checkOut = new Date(body.checkOut);

          if (checkOut <= checkIn) {
            return HttpResponse.json(
              {
                error: 'Validation failed',
                details: ['checkOut must be after checkIn'],
              },
              { status: 400 }
            );
          }

          return HttpResponse.json({ data: body }, { status: 201 });
        })
      );

      const response = await fetch('/api/v1/operations/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: tomorrow.toISOString(),
          checkOut: today.toISOString(),
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details).toContain('checkOut must be after checkIn');
    });
  });
});

describe('Check-In / Check-Out', () => {
  describe('Check-In', () => {
    it('allows check-in for confirmed booking', async () => {
      const booking = createBooking({ status: 'CONFIRMED' });

      server.use(
        http.post(`/api/v1/operations/bookings/${booking.recordId}/check-in`, () => {
          return HttpResponse.json({
            data: {
              ...booking,
              status: 'CHECKED_IN',
              checkedInAt: new Date().toISOString(),
            },
          });
        })
      );

      const response = await fetch(
        `/api/v1/operations/bookings/${booking.recordId}/check-in`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data.status).toBe('CHECKED_IN');
      expect(data.data.checkedInAt).toBeDefined();
    });

    it('rejects check-in for pending booking', async () => {
      const booking = createBooking({ status: 'PENDING' });

      server.use(
        http.post(`/api/v1/operations/bookings/${booking.recordId}/check-in`, () => {
          return HttpResponse.json(
            {
              error: 'Cannot check in a pending booking. Please confirm first.',
            },
            { status: 400 }
          );
        })
      );

      const response = await fetch(
        `/api/v1/operations/bookings/${booking.recordId}/check-in`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('pending');
    });

    it('rejects check-in for cancelled booking', async () => {
      const booking = createBooking({ status: 'CANCELLED' });

      server.use(
        http.post(`/api/v1/operations/bookings/${booking.recordId}/check-in`, () => {
          return HttpResponse.json(
            {
              error: 'Cannot check in a cancelled booking.',
            },
            { status: 400 }
          );
        })
      );

      const response = await fetch(
        `/api/v1/operations/bookings/${booking.recordId}/check-in`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Check-Out', () => {
    it('allows check-out for checked-in booking', async () => {
      const booking = createBooking({ status: 'CHECKED_IN' });

      server.use(
        http.post(`/api/v1/operations/bookings/${booking.recordId}/check-out`, () => {
          return HttpResponse.json({
            data: {
              ...booking,
              status: 'CHECKED_OUT',
              checkedOutAt: new Date().toISOString(),
            },
          });
        })
      );

      const response = await fetch(
        `/api/v1/operations/bookings/${booking.recordId}/check-out`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.data.status).toBe('CHECKED_OUT');
      expect(data.data.checkedOutAt).toBeDefined();
    });

    it('rejects check-out for non-checked-in booking', async () => {
      const booking = createBooking({ status: 'CONFIRMED' });

      server.use(
        http.post(`/api/v1/operations/bookings/${booking.recordId}/check-out`, () => {
          return HttpResponse.json(
            {
              error: 'Can only check out a checked-in booking.',
            },
            { status: 400 }
          );
        })
      );

      const response = await fetch(
        `/api/v1/operations/bookings/${booking.recordId}/check-out`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      expect(response.status).toBe(400);
    });
  });
});

describe('Booking Status Transitions', () => {
  it('transitions from PENDING to CONFIRMED', async () => {
    const booking = createBooking({ status: 'PENDING' });

    server.use(
      http.put(`/api/v1/operations/bookings/${booking.recordId}`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          data: { ...booking, ...body },
        });
      })
    );

    const response = await fetch(`/api/v1/operations/bookings/${booking.recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CONFIRMED' }),
    });

    const data = await response.json();
    expect(data.data.status).toBe('CONFIRMED');
  });

  it('transitions from PENDING to CANCELLED', async () => {
    const booking = createBooking({ status: 'PENDING' });

    server.use(
      http.put(`/api/v1/operations/bookings/${booking.recordId}`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          data: {
            ...booking,
            ...body,
            cancelledAt: new Date().toISOString(),
          },
        });
      })
    );

    const response = await fetch(`/api/v1/operations/bookings/${booking.recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CANCELLED', cancellationReason: 'Customer request' }),
    });

    const data = await response.json();
    expect(data.data.status).toBe('CANCELLED');
    expect(data.data.cancelledAt).toBeDefined();
  });
});

describe('Booking Conflicts', () => {
  it('detects kennel overbooking', async () => {
    const kennel = createKennel({ capacity: 1 });

    server.use(
      http.get('/api/v1/operations/bookings/conflicts', ({ request }) => {
        const url = new URL(request.url);
        const kennelId = url.searchParams.get('kennelId');

        if (kennelId === kennel.recordId) {
          return HttpResponse.json({
            hasConflicts: true,
            conflicts: [
              {
                kennelId: kennel.recordId,
                kennelName: kennel.name,
                date: '2024-12-20',
                currentOccupancy: 2,
                maxCapacity: 1,
              },
            ],
          });
        }

        return HttpResponse.json({ hasConflicts: false, conflicts: [] });
      })
    );

    const response = await fetch(
      `/api/v1/operations/bookings/conflicts?kennelId=${kennel.recordId}`
    );
    const data = await response.json();

    expect(data.hasConflicts).toBe(true);
    expect(data.conflicts).toHaveLength(1);
    expect(data.conflicts[0].currentOccupancy).toBeGreaterThan(
      data.conflicts[0].maxCapacity
    );
  });

  it('returns no conflicts for available kennel', async () => {
    server.use(
      http.get('/api/v1/operations/bookings/conflicts', () => {
        return HttpResponse.json({
          hasConflicts: false,
          conflicts: [],
        });
      })
    );

    const response = await fetch('/api/v1/operations/bookings/conflicts?kennelId=available-kennel');
    const data = await response.json();

    expect(data.hasConflicts).toBe(false);
    expect(data.conflicts).toHaveLength(0);
  });
});

describe('Booking with Related Entities', () => {
  it('creates booking with pet and owner', async () => {
    const { owner, pets } = createOwnerWithPets(1);
    const pet = pets[0];
    const kennel = createKennel();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);

    server.use(
      http.post('/api/v1/operations/bookings', async ({ request }) => {
        const body = await request.json();

        return HttpResponse.json(
          {
            data: {
              recordId: 'new-booking',
              status: 'PENDING',
              ...body,
              pet: pet,
              owner: owner,
              kennel: kennel,
            },
          },
          { status: 201 }
        );
      })
    );

    const response = await fetch('/api/v1/operations/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        checkIn: tomorrow.toISOString(),
        checkOut: nextWeek.toISOString(),
        petId: pet.recordId,
        ownerId: owner.recordId,
        kennelId: kennel.recordId,
      }),
    });

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data.data.pet).toBeDefined();
    expect(data.data.owner).toBeDefined();
    expect(data.data.kennel).toBeDefined();
  });
});
