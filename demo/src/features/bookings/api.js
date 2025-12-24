/**
 * Demo Bookings API
 * Provides mock data hooks for bookings management.
 * Replaces real API calls with static demo data.
 * Generates dynamic dates centered around current week.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import petsData from '@/data/pets.json';
import ownersData from '@/data/owners.json';
import toast from 'react-hot-toast';

// ============================================================================
// BOOKING STATUS ENUM
// ============================================================================

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
};

// ============================================================================
// DATE HELPERS
// ============================================================================

const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ============================================================================
// DYNAMIC BOOKINGS GENERATOR
// ============================================================================

// Local bookings state (persists during session)
let localBookingsStore = null;

/**
 * Generate bookings with dynamic dates centered around current week
 */
const generateDynamicBookings = () => {
  if (localBookingsStore !== null) {
    return localBookingsStore;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = getWeekStart(today);

  // Create sample bookings across the current week
  const sampleBookings = [
    // Currently checked in - started yesterday, ends tomorrow
    {
      id: 'bk-demo-001',
      petId: 'pet-001',
      ownerId: 'owner-001',
      serviceName: 'Overnight Boarding',
      serviceId: 'svc-boarding',
      status: BOOKING_STATUS.CHECKED_IN,
      checkInDate: formatDate(addDays(today, -1)),
      checkOutDate: formatDate(addDays(today, 1)),
      checkInTime: '10:00',
      checkOutTime: '16:00',
      notes: 'Loves belly rubs. Feed twice daily.',
      subtotal: 150,
      addons: ['Premium Food', 'Extra Playtime'],
    },
    // Arriving today - confirmed
    {
      id: 'bk-demo-002',
      petId: 'pet-002',
      ownerId: 'owner-002',
      serviceName: 'Weekend Stay',
      serviceId: 'svc-boarding',
      status: BOOKING_STATUS.CONFIRMED,
      checkInDate: formatDate(today),
      checkOutDate: formatDate(addDays(today, 2)),
      checkInTime: '09:00',
      checkOutTime: '17:00',
      notes: 'Shy around other dogs initially.',
      subtotal: 200,
      addons: ['Grooming'],
    },
    // Departing today - checked in, needs checkout
    {
      id: 'bk-demo-003',
      petId: 'pet-003',
      ownerId: 'owner-003',
      serviceName: 'Overnight Boarding',
      serviceId: 'svc-boarding',
      status: BOOKING_STATUS.CHECKED_IN,
      checkInDate: formatDate(addDays(today, -2)),
      checkOutDate: formatDate(today),
      checkInTime: '14:00',
      checkOutTime: '11:00',
      notes: 'Medication at 8 AM and 8 PM.',
      subtotal: 100,
      addons: [],
    },
    // Tomorrow arrival
    {
      id: 'bk-demo-004',
      petId: 'pet-004',
      ownerId: 'owner-004',
      serviceName: 'Extended Stay',
      serviceId: 'svc-boarding',
      status: BOOKING_STATUS.CONFIRMED,
      checkInDate: formatDate(addDays(today, 1)),
      checkOutDate: formatDate(addDays(today, 5)),
      checkInTime: '10:00',
      checkOutTime: '16:00',
      notes: 'Allergic to chicken.',
      subtotal: 350,
      addons: ['Special Diet'],
    },
    // Day after tomorrow
    {
      id: 'bk-demo-005',
      petId: 'pet-005',
      ownerId: 'owner-005',
      serviceName: 'Daycare',
      serviceId: 'svc-daycare',
      status: BOOKING_STATUS.CONFIRMED,
      checkInDate: formatDate(addDays(today, 2)),
      checkOutDate: formatDate(addDays(today, 2)),
      checkInTime: '08:00',
      checkOutTime: '18:00',
      notes: '',
      subtotal: 45,
      addons: [],
    },
    // Long stay - already here
    {
      id: 'bk-demo-006',
      petId: 'pet-006',
      ownerId: 'owner-006',
      serviceName: 'Extended Vacation Stay',
      serviceId: 'svc-boarding',
      status: BOOKING_STATUS.CHECKED_IN,
      checkInDate: formatDate(addDays(today, -3)),
      checkOutDate: formatDate(addDays(today, 4)),
      checkInTime: '11:00',
      checkOutTime: '15:00',
      notes: 'Very friendly, loves other dogs.',
      subtotal: 550,
      addons: ['Daily Walks', 'Extra Playtime'],
    },
    // Pending confirmation
    {
      id: 'bk-demo-007',
      petId: 'pet-007',
      ownerId: 'owner-007',
      serviceName: 'Overnight Boarding',
      serviceId: 'svc-boarding',
      status: BOOKING_STATUS.PENDING,
      checkInDate: formatDate(addDays(today, 3)),
      checkOutDate: formatDate(addDays(today, 5)),
      checkInTime: '14:00',
      checkOutTime: '12:00',
      notes: 'Awaiting vaccination records.',
      subtotal: 200,
      addons: [],
    },
    // Completed yesterday
    {
      id: 'bk-demo-008',
      petId: 'pet-008',
      ownerId: 'owner-008',
      serviceName: 'Weekend Stay',
      serviceId: 'svc-boarding',
      status: BOOKING_STATUS.CHECKED_OUT,
      checkInDate: formatDate(addDays(today, -4)),
      checkOutDate: formatDate(addDays(today, -1)),
      checkInTime: '09:00',
      checkOutTime: '17:00',
      notes: 'Great stay!',
      subtotal: 250,
      addons: ['Grooming', 'Bath'],
    },
    // Daycare today
    {
      id: 'bk-demo-009',
      petId: 'pet-009',
      ownerId: 'owner-009',
      serviceName: 'Full Day Daycare',
      serviceId: 'svc-daycare',
      status: BOOKING_STATUS.CHECKED_IN,
      checkInDate: formatDate(today),
      checkOutDate: formatDate(today),
      checkInTime: '07:30',
      checkOutTime: '18:00',
      notes: '',
      subtotal: 50,
      addons: [],
    },
    // Next week booking
    {
      id: 'bk-demo-010',
      petId: 'pet-010',
      ownerId: 'owner-010',
      serviceName: 'Overnight Boarding',
      serviceId: 'svc-boarding',
      status: BOOKING_STATUS.CONFIRMED,
      checkInDate: formatDate(addDays(today, 6)),
      checkOutDate: formatDate(addDays(today, 8)),
      checkInTime: '10:00',
      checkOutTime: '16:00',
      notes: 'Prefers quiet areas.',
      subtotal: 180,
      addons: ['Quiet Room'],
    },
  ];

  localBookingsStore = sampleBookings;
  return sampleBookings;
};

/**
 * Normalize a booking with pet and owner data
 */
const normalizeBooking = (booking) => {
  if (!booking) return null;

  // Find related pet and owner data
  const pet = petsData.find((p) => p.id === booking.petId);
  const owner = ownersData.find((o) => o.id === booking.ownerId);

  return {
    ...booking,
    recordId: booking.id,
    // Date fields
    checkIn: booking.checkInDate,
    checkOut: booking.checkOutDate,
    startDate: booking.checkInDate,
    endDate: booking.checkOutDate,
    checkInTime: booking.checkInTime,
    checkOutTime: booking.checkOutTime,
    // Pet info
    petId: booking.petId,
    petName: pet?.name || 'Unknown Pet',
    petBreed: pet?.breed,
    petPhotoUrl: pet?.photoUrl,
    petSpecies: pet?.species || 'Dog',
    pet: pet || { id: booking.petId, name: 'Unknown Pet' },
    // Owner info
    ownerId: booking.ownerId,
    ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown Owner',
    ownerPhone: owner?.phone,
    ownerEmail: owner?.email,
    owner: owner || { id: booking.ownerId, name: 'Unknown Owner' },
    // Service info
    serviceType: booking.serviceName?.toLowerCase().includes('daycare')
      ? 'daycare'
      : booking.serviceName?.toLowerCase().includes('groom')
      ? 'grooming'
      : 'boarding',
    serviceName: booking.serviceName,
    service: { id: booking.serviceId, name: booking.serviceName },
    // Flags
    hasExpiringVaccinations: pet?.vaccinationStatus === 'expiring' || pet?.vaccinationStatus === 'expired',
    hasNotes: !!booking.notes,
    notes: booking.notes,
    // Pricing
    totalCents: Math.round((booking.subtotal || 0) * 100),
    amountPaidCents: 0,
  };
};

/**
 * Get all bookings normalized
 */
const getAllBookings = () => {
  return generateDynamicBookings().map(normalizeBooking);
};

/**
 * Add a booking to local state
 */
const addBookingToStore = (booking) => {
  if (localBookingsStore === null) {
    generateDynamicBookings();
  }
  localBookingsStore = [booking, ...localBookingsStore];
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch all bookings
 */
export const useBookingsQuery = (params = {}) => {
  return useQuery({
    queryKey: ['demo', 'bookings', params],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));

      let bookings = getAllBookings();

      // Apply filters
      if (params.status) {
        bookings = bookings.filter((b) => b.status === params.status);
      }

      if (params.date) {
        bookings = bookings.filter(
          (b) => b.checkIn === params.date || b.checkOut === params.date
        );
      }

      return bookings;
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Fetch a single booking by ID
 */
export const useBookingDetailQuery = (bookingId, options = {}) => {
  return useQuery({
    queryKey: ['demo', 'bookings', bookingId],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 100));
      const bookings = getAllBookings();
      return bookings.find((b) => b.id === bookingId || b.recordId === bookingId) || null;
    },
    enabled: !!bookingId && (options.enabled !== false),
    ...options,
  });
};

// Alias
export const useBookingQuery = useBookingDetailQuery;

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new booking - adds to local state and shows toast
 */
export const useCreateBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      await new Promise((r) => setTimeout(r, 800));

      const newBooking = {
        id: `bk-new-${Date.now()}`,
        petId: payload.petId,
        ownerId: payload.ownerId,
        serviceName: payload.serviceName || 'Overnight Boarding',
        serviceId: payload.serviceId || 'svc-boarding',
        status: BOOKING_STATUS.CONFIRMED,
        checkInDate: payload.startDate || payload.checkIn,
        checkOutDate: payload.endDate || payload.checkOut,
        checkInTime: payload.checkInTime || '10:00',
        checkOutTime: payload.checkOutTime || '16:00',
        notes: payload.notes || '',
        subtotal: payload.subtotal || 100,
        addons: payload.addons || [],
        createdAt: new Date().toISOString(),
      };

      // Add to local store
      addBookingToStore(newBooking);

      return newBooking;
    },
    onSuccess: (data) => {
      toast.success('Booking created successfully!');
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['demo', 'today-bookings'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create booking');
    },
  });
};

/**
 * Update a booking (demo - just simulates success)
 */
export const useUpdateBookingMutation = (bookingId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      await new Promise((r) => setTimeout(r, 500));
      return { id: bookingId, ...payload };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
    },
  });
};

/**
 * Delete a booking (demo - just simulates success)
 */
export const useDeleteBookingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId) => {
      await new Promise((r) => setTimeout(r, 300));
      return bookingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
    },
  });
};

/**
 * Check in a booking
 */
export const useBookingCheckInMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, payload = {} }) => {
      await new Promise((r) => setTimeout(r, 600));
      return {
        id: bookingId,
        status: BOOKING_STATUS.CHECKED_IN,
        actualCheckIn: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['demo', 'today-bookings'] });
    },
  });
};

/**
 * Check out a booking
 */
export const useBookingCheckOutMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, payload = {} }) => {
      await new Promise((r) => setTimeout(r, 600));
      return {
        id: bookingId,
        status: BOOKING_STATUS.CHECKED_OUT,
        actualCheckOut: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['demo', 'today-bookings'] });
    },
  });
};

/**
 * Assign a kennel to a booking
 */
export const useAssignKennelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, kennelId }) => {
      await new Promise((r) => setTimeout(r, 400));
      return { id: bookingId, kennelId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demo', 'bookings'] });
    },
  });
};

/**
 * Check for booking conflicts
 */
export const useBookingConflictsQuery = (params = {}) => {
  const { kennelId, startDate, endDate } = params;
  const enabled = !!kennelId && !!startDate && !!endDate;

  return useQuery({
    queryKey: ['demo', 'booking-conflicts', params],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 100));
      // In demo mode, we never have conflicts
      return { conflicts: [], hasConflicts: false, count: 0 };
    },
    enabled,
    staleTime: 30 * 1000,
  });
};
