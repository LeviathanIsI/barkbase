import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBookingStore } from '@/stores/booking';
import { useTenantStore } from '@/stores/tenant';
import '@testing-library/jest-dom';

vi.mock('../CheckInModal', () => ({ default: () => null }));
vi.mock('../CheckOutModal', () => ({ default: () => null }));

import BookingCalendar from '../BookingCalendar';


let capturedDragHandler;

const mockKennels = [{ id: 'kennel-1', name: 'Suite 1', type: 'SUITE' }];
const mockBookings = [
  {
    id: 'booking-1',
    petName: 'Riley',
    ownerName: 'Alex Anderson',
    status: 'CONFIRMED',
    checkIn: '2025-01-01T08:00:00.000Z',
    checkOut: '2025-01-02T08:00:00.000Z',
    dateRange: { start: '2025-01-01T08:00:00.000Z', end: '2025-01-02T08:00:00.000Z' },
    segments: [
      {
        kennelId: 'kennel-1',
        startDate: '2025-01-01T08:00:00.000Z',
        endDate: '2025-01-02T08:00:00.000Z',
        status: 'CONFIRMED',
      },
    ],
  },
];

vi.mock('@/lib/offlineQueue', () => ({
  enqueueRequest: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }) => {
    capturedDragHandler = onDragEnd;
    return <div>{children}</div>;
  },
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({ setNodeRef: vi.fn(), listeners: {}, attributes: {}, transform: null, isDragging: false }),
}));

const updateBookingMock = vi.fn().mockResolvedValue({
  ...mockBookings[0],
  checkIn: '2025-01-03T08:00:00.000Z',
  checkOut: '2025-01-04T08:00:00.000Z',
  segments: [
    {
      kennelId: 'kennel-1',
      startDate: '2025-01-03T08:00:00.000Z',
      endDate: '2025-01-04T08:00:00.000Z',
      status: 'CONFIRMED',
    },
  ],
});

const bookingState = (() => {
  const state = {
    bookings: [],
    waitlist: [],
    moveBooking: vi.fn(),
    setBookings: vi.fn((bookings) => {
      state.bookings = bookings;
    }),
    setWaitlist: vi.fn((entries) => {
      state.waitlist = entries;
    }),
    upsertBooking: vi.fn((booking) => {
      const index = state.bookings.findIndex((item) => item.id === booking.id);
      if (index === -1) {
        state.bookings = [booking, ...state.bookings];
      } else {
        state.bookings = state.bookings.map((item, idx) => (idx === index ? { ...item, ...booking } : item));
      }
    }),
  };
  return state;
})();

vi.mock('@/stores/booking', () => {
  const useBookingStoreMock = (selector = (s) => s) => selector(bookingState);
  useBookingStoreMock.getState = () => bookingState;
  useBookingStoreMock.setState = (updater) => {
    const partial = typeof updater === 'function' ? updater(bookingState) : updater;
    Object.assign(bookingState, partial);
  };
  return { useBookingStore: useBookingStoreMock };
});

vi.mock('../../api', () => ({
  useBookingsQuery: () => ({ data: mockBookings, isLoading: false }),
  useKennelAvailability: () => ({ data: mockKennels }),
  updateBooking: (...args) => updateBookingMock(...args),
}));

vi.mock('@/lib/socket', () => ({
  getSocket: () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

beforeEach(() => {
  updateBookingMock.mockClear();
  const state = useBookingStore.getState();
  state.moveBooking.mockClear();
  state.setBookings.mockClear();
  state.setWaitlist.mockClear();
  state.upsertBooking.mockClear();
  useTenantStore.setState({
    tenant: {
      id: 'tenant-1',
      slug: 'acme',
      name: 'Acme',
      plan: 'PRO',
      theme: {},
      featureFlags: {},
      terminology: {},
    },
    initialized: true,
  });
  useBookingStore.setState({
    bookings: mockBookings.map((booking) => ({
      ...booking,
      segments: booking.segments?.map((segment) => ({ ...segment })) ?? [],
    })),
    waitlist: [],
  });
});

describe('BookingCalendar drag', () => {
  it('calls updateBooking on drag end', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <BookingCalendar />
      </QueryClientProvider>,
    );

    const dropDate = new Date('2025-01-03T08:00:00.000Z');

    await capturedDragHandler({
      active: { id: 'booking-1' },
      over: { data: { current: { kennelId: 'kennel-1', date: dropDate } } },
    });

    expect(updateBookingMock).toHaveBeenCalledTimes(1);
    const [bookingId, payload] = updateBookingMock.mock.calls[0];
    expect(bookingId).toBe('booking-1');
    expect(payload.kennelId).toBeUndefined();
    expect(payload.segments?.[0]?.kennelId).toBe('kennel-1');
  });
});
