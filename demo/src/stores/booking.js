import { create } from 'zustand';

const initialFilters = {
  status: 'all',
  kennelType: 'all',
  dateRange: {
    start: null,
    end: null,
  },
  services: [],
};

export const useBookingStore = create((set, get) => ({
  bookings: [],
  waitlist: [],
  kennelCapacity: {},
  calendarView: 'week',
  filters: initialFilters,
  activeBookingId: null,
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
  setBookings: (bookings) => set({ bookings }),
  upsertBooking: (booking) => {
    set((state) => {
      const exists = state.bookings.some(({ recordId }) => id === booking.recordId);
      return {
        bookings: exists
          ? state.bookings.map((item) => (item.recordId === booking.recordId ? { ...item, ...booking } : item))
          : [booking, ...state.bookings],
      };
    });
  },
  updateBooking: (bookingId, updater) => {
    set((state) => ({
      bookings: state.bookings.map((booking) => {
        if (booking.recordId !== bookingId) return booking;
        const updates = typeof updater === 'function' ? updater(booking) : updater;
        return { ...booking, ...updates };
      }),
    }));
  },
  removeBooking: (bookingId) => {
    set((state) => ({ bookings: state.bookings.filter((booking) => booking.recordId !== bookingId) }));
  },
  setWaitlist: (entries) => set({ waitlist: entries }),
  promoteWaitlistEntry: (entryId, targetKennelId, entryDateRange) => {
    const entry = get().waitlist.find((item) => item.recordId === entryId);
    if (!entry) return;
    const booking = {
      ...entry,
      id: `temp-${crypto.randomUUID()}`,
      kennelId: targetKennelId,
      status: 'PENDING',
      checkIn: entryDateRange?.start ?? entry.checkIn,
      checkOut: entryDateRange?.end ?? entry.checkOut,
    };
    set((state) => ({
      bookings: [booking, ...state.bookings],
      waitlist: state.waitlist.filter((item) => item.recordId !== entryId),
    }));
  },
  setCalendarView: (view) => set({ calendarView: view }),
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  resetFilters: () => set({ filters: initialFilters }),
  setActiveBooking: (bookingId) => set({ activeBookingId: bookingId }),
  registerCapacitySnapshot: (kennelType, snapshot) => {
    set((state) => ({
      kennelCapacity: {
        ...state.kennelCapacity,
        [kennelType]: snapshot,
      },
    }));
  },
  moveBooking: ({ bookingId, targetKennelId, targetDate, status }) => {
    const source = get().bookings.find((booking) => booking.recordId === bookingId);
    if (!source) return;
    set((state) => ({
      bookings: state.bookings.map((booking) => {
        if (booking.recordId !== bookingId) return booking;
        return {
          ...booking,
          kennelId: targetKennelId ?? booking.kennelId,
          checkIn: targetDate?.start ?? booking.checkIn,
          checkOut: targetDate?.end ?? booking.checkOut,
          status: status ?? booking.status,
        };
      }),
    }));
  },
}));
