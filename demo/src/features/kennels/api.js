import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import toast from 'react-hot-toast';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

/**
 * Check if tenant is ready for API calls
 * Queries should be disabled until tenantId is available
 */
const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

// Kennels are facilities/entities - using entity service
const KENNELS_BASE = '/api/v1/entity/facilities';

/**
 * Normalize a single kennel from backend field names to frontend expectations
 * Backend: max_occupancy, is_active, location, size
 * Frontend: capacity, isActive, building, type
 */
const normalizeKennel = (kennel) => {
  if (!kennel) return null;

  // Map size to type for display
  const sizeToType = {
    'SMALL': 'KENNEL',
    'MEDIUM': 'KENNEL',
    'LARGE': 'KENNEL',
    'XLARGE': 'SUITE',
  };

  return {
    ...kennel,
    // Core ID fields
    id: kennel.id,
    recordId: kennel.id,
    // Capacity mapping
    capacity: kennel.max_occupancy || kennel.capacity || 1,
    maxOccupancy: kennel.max_occupancy || kennel.capacity || 1,
    // Status mapping
    isActive: kennel.is_active !== undefined ? kennel.is_active : (kennel.isActive !== false),
    // Location/building mapping
    building: kennel.location || kennel.building || null,
    location: kennel.location || kennel.building || null,
    // Type mapping from size
    type: kennel.type || sizeToType[kennel.size] || 'KENNEL',
    size: kennel.size || null,
    // Occupied from backend (may be string from COUNT) - defaults to 0
    occupied: parseInt(kennel.occupied, 10) || 0,
  };
};

/**
 * Normalize kennels response to always return an array with normalized fields
 */
const normalizeKennelsResponse = (data) => {
  if (!data) return [];

  let items = [];
  if (Array.isArray(data)) items = data;
  else if (Array.isArray(data?.data)) items = data.data;
  else if (Array.isArray(data?.items)) items = data.items;
  else if (Array.isArray(data?.kennels)) items = data.kennels;
  else if (Array.isArray(data?.facilities)) items = data.facilities;

  return items.map(normalizeKennel);
};

/**
 * Fetch all kennels/facilities for the current tenant
 *
 * Backend response shape (from entity-service):
 * { data: [{ id, tenant_id, name, type, capacity, is_active, notes, created_at, updated_at }] }
 *
 * Returns: array of kennel objects (always an array, even on error)
 */
export const useKennels = (filters = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['kennels', tenantKey, filters],
    queryFn: async () => {
      try {
        const res = await apiClient.get(KENNELS_BASE, { params: { ...filters, type: 'kennel' } });
        const kennels = normalizeKennelsResponse(res?.data);
        return kennels;
      } catch (e) {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: isTenantReady,
  });
};

/**
 * Fetch kennels with current occupancy data
 */
export const useKennelsWithOccupancy = () => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['kennels', tenantKey, 'occupancy'],
    queryFn: async () => {
      try {
        // Occupancy is in analytics service
        const res = await apiClient.get('/api/v1/analytics/occupancy/current');
        return res.data?.data || res.data || {};
      } catch (e) {
        return { currentOccupancy: 0, totalCapacity: 0, occupancyRate: 0 };
      }
    },
    staleTime: 1 * 60 * 1000, // 1 minute - occupancy changes frequently
    enabled: isTenantReady,
  });
};

/**
 * Fetch single kennel by ID
 */
export const useKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['kennels', tenantKey, kennelId],
    queryFn: async () => {
      const res = await apiClient.get(`${KENNELS_BASE}/${kennelId}`);
      return res.data;
    },
    enabled: isTenantReady && !!kennelId,
  });
};

/**
 * Create kennel mutation
 *
 * Backend: POST /api/v1/entity/facilities
 * Creates a new kennel/facility with real DB persistence
 */
export const useCreateKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.post(KENNELS_BASE, { ...payload, type: 'kennel' });
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      toast.success('Kennel created successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create kennel');
    },
  });
};

/**
 * Update kennel mutation
 *
 * Backend: PUT /api/v1/entity/facilities/:id
 * Updates an existing kennel/facility with real DB persistence
 */
export const useUpdateKennel = (kennelId) => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await apiClient.put(`${KENNELS_BASE}/${kennelId}`, payload);
      return res.data?.data || res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey, kennelId] });
      toast.success('Kennel updated successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update kennel');
    },
  });
};

/**
 * Delete kennel mutation
 */
export const useDeleteKennel = () => {
  const tenantKey = useTenantKey();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (kennelId) => {
      await apiClient.delete(`${KENNELS_BASE}/${kennelId}`);
      return kennelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kennels', tenantKey] });
      toast.success('Kennel deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete kennel');
    },
  });
};

/**
 * Fetch available kennels for a date range
 * Filters out kennels that have bookings during the specified period
 */
export const useAvailableKennels = (startDate, endDate) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['kennels', tenantKey, 'available', startDate, endDate],
    queryFn: async () => {
      try {
        // Fetch all kennels
        const kennelsRes = await apiClient.get(KENNELS_BASE, { params: { type: 'kennel' } });
        const kennels = normalizeKennelsResponse(kennelsRes?.data);

        // Fetch bookings that overlap with the date range
        const bookingsRes = await apiClient.get('/api/v1/entity/bookings', {
          params: {
            startDate,
            endDate,
            status: 'PENDING,CONFIRMED,CHECKED_IN',
          },
        });

        const bookings = bookingsRes?.data?.data || bookingsRes?.data || [];

        // Get kennel IDs that are reserved during this period
        const reservedKennelIds = new Set(
          bookings
            .filter(b => b.kennelId || b.kennel_id)
            .map(b => b.kennelId || b.kennel_id)
        );

        // Filter to only active, unreserved kennels
        return kennels.filter(k =>
          k.isActive &&
          !reservedKennelIds.has(k.id) &&
          !reservedKennelIds.has(k.recordId)
        );
      } catch (e) {
        return [];
      }
    },
    staleTime: 1 * 60 * 1000,
    enabled: isTenantReady && !!startDate && !!endDate,
  });
};

/**
 * Fetch kennels with their reservation status for facility map
 * Returns kennels with a `reservationStatus` field
 */
export const useKennelsWithReservations = () => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['kennels', tenantKey, 'withReservations'],
    queryFn: async () => {
      try {
        // Fetch all kennels
        const kennelsRes = await apiClient.get(KENNELS_BASE, { params: { type: 'kennel' } });
        const kennels = normalizeKennelsResponse(kennelsRes?.data);

        // Fetch future bookings with kennel assignments
        const today = new Date().toISOString().split('T')[0];
        const bookingsRes = await apiClient.get('/api/v1/entity/bookings', {
          params: {
            startDateFrom: today,
            status: 'PENDING,CONFIRMED',
          },
        });

        const bookings = bookingsRes?.data?.data || bookingsRes?.data || [];

        // Map kennel IDs to their future reservations
        const reservationMap = new Map();
        bookings.forEach(b => {
          const kennelId = b.kennelId || b.kennel_id;
          if (kennelId) {
            if (!reservationMap.has(kennelId)) {
              reservationMap.set(kennelId, []);
            }
            reservationMap.get(kennelId).push({
              bookingId: b.id || b.recordId,
              petName: b.petName || b.pet_name,
              ownerName: b.ownerName || b.owner_name,
              startDate: b.startDate || b.start_date,
              endDate: b.endDate || b.end_date,
            });
          }
        });

        // Add reservation status to each kennel
        return kennels.map(k => {
          const kennelId = k.id || k.recordId;
          const reservations = reservationMap.get(kennelId) || [];
          return {
            ...k,
            futureReservations: reservations,
            hasReservation: reservations.length > 0,
          };
        });
      } catch (e) {
        return [];
      }
    },
    staleTime: 2 * 60 * 1000,
    enabled: isTenantReady,
  });
};
