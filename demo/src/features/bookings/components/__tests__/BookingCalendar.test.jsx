import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTenantStore } from '@/stores/tenant';
import '@testing-library/jest-dom';

// Set up mocks BEFORE importing the component
vi.mock('../CheckInModal', () => ({ default: () => null }));
vi.mock('../CheckOutModal', () => ({ default: () => null }));
vi.mock('../QuickCheckIn', () => ({ default: () => <div data-testid="quick-check-in">Quick Check-In</div> }));
vi.mock('../WaitlistManager', () => ({ default: () => <div data-testid="waitlist-manager">Waitlist</div> }));

vi.mock('@/lib/offlineQueue', () => ({
  enqueueRequest: vi.fn(),
}));

vi.mock('@/lib/terminology', () => ({
  useTerminology: () => ({
    getDisplayName: (type, name) => name,
  }),
}));

vi.mock('@/lib/socket', () => ({
  getSocket: () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

// Mock Card to render header prop content
vi.mock('@/components/ui/Card', () => ({
  default: ({ children, header, ...props }) => (
    <div data-testid="card" {...props}>
      {header && <div data-testid="card-header">{header}</div>}
      {children}
    </div>
  ),
  Card: ({ children, header, ...props }) => (
    <div data-testid="card" {...props}>
      {header && <div data-testid="card-header">{header}</div>}
      {children}
    </div>
  ),
}));

let capturedDragHandler;

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }) => {
    capturedDragHandler = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useDraggable: () => ({ setNodeRef: vi.fn(), listeners: {}, attributes: {}, transform: null, isDragging: false }),
}));

const mockKennels = [{ recordId: 'kennel-1', name: 'Suite 1', type: 'SUITE' }];
const mockBookings = [
  {
    recordId: 'booking-1',
    petName: 'Riley',
    ownerName: 'Alex Anderson',
    status: 'CONFIRMED',
    deposit: 50,
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
      const index = state.bookings.findIndex((item) => item.recordId === booking.recordId);
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
  useBookingsQuery: vi.fn(() => ({ data: mockBookings, isLoading: false })),
  updateBooking: (...args) => updateBookingMock(...args),
}));

vi.mock('@/features/kennels/api', () => ({
  useKennelAvailability: vi.fn(() => ({ data: mockKennels })),
}));

// Import after mocks
import BookingCalendar from '../BookingCalendar';
import { useBookingStore } from '@/stores/booking';

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

describe('BookingCalendar', () => {
  it('renders the booking calendar', () => {
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

    // Check that core UI elements are rendered
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    expect(screen.getByText('Bookings Board')).toBeInTheDocument();
  });

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
      active: { recordId: 'booking-1' },
      over: { data: { current: { kennelId: 'kennel-1', date: dropDate } } },
    });

    expect(updateBookingMock).toHaveBeenCalledTimes(1);
    const [bookingId, payload] = updateBookingMock.mock.calls[0];
    expect(bookingId).toBe('booking-1');
    expect(payload.kennelId).toBeUndefined();
    expect(payload.segments?.[0]?.kennelId).toBe('kennel-1');
  });
});
