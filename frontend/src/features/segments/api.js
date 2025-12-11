/**
 * Segments API hooks
 * Extends and re-exports from communications/api.js for segments-specific functionality
 */

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { listQueryDefaults, detailQueryDefaults } from '@/lib/queryConfig';

// Re-export existing hooks
export {
  useSegments,
  useSegmentMembers,
  useCreateSegment,
  useUpdateSegment,
  useAddSegmentMembers,
  useRemoveSegmentMembers,
  useDeleteSegment,
  useRefreshSegments,
} from '@/features/communications/api';

/**
 * Get a single segment by ID
 */
export const useSegment = (segmentId) => {
  return useQuery({
    queryKey: ['segment', segmentId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/segments/${segmentId}`);
      return res.data?.segment || res.data;
    },
    enabled: !!segmentId,
    ...detailQueryDefaults,
  });
};

/**
 * Preview segment members based on filters (for builder)
 */
export const useSegmentPreview = (filters, objectType, enabled = true) => {
  return useQuery({
    queryKey: ['segment-preview', objectType, filters],
    queryFn: async () => {
      const res = await apiClient.post('/api/v1/segments/preview', {
        filters,
        objectType,
        limit: 10,
      });
      return res.data || { count: 0, sample: [] };
    },
    enabled: enabled && !!objectType && filters?.groups?.length > 0,
    staleTime: 0, // Always refetch on filter change
    refetchOnWindowFocus: false,
  });
};

/**
 * Clone a segment
 */
export const useCloneSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId) => {
      const res = await apiClient.post(`/api/v1/segments/${segmentId}/clone`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
};

/**
 * Convert segment between active and static
 */
export const useConvertSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ segmentId, targetType }) => {
      const res = await apiClient.post(`/api/v1/segments/${segmentId}/convert`, { targetType });
      return res.data;
    },
    onSuccess: (_, { segmentId }) => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segment', segmentId] });
      queryClient.invalidateQueries({ queryKey: ['segment-members', segmentId] });
    },
  });
};

/**
 * Refresh a single segment's member count
 */
export const useRefreshSegment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segmentId) => {
      const res = await apiClient.post(`/api/v1/segments/${segmentId}/refresh`);
      return res.data;
    },
    onSuccess: (_, segmentId) => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      queryClient.invalidateQueries({ queryKey: ['segment', segmentId] });
      queryClient.invalidateQueries({ queryKey: ['segment-members', segmentId] });
    },
  });
};

/**
 * Get segment activity/history
 */
export const useSegmentActivity = (segmentId) => {
  return useInfiniteQuery({
    queryKey: ['segment-activity', segmentId],
    queryFn: async ({ pageParam = 0 }) => {
      try {
        const res = await apiClient.get(`/api/v1/segments/${segmentId}/activity`, {
          params: { offset: pageParam, limit: 50 },
        });
        return res.data || { items: [], total: 0, offset: pageParam };
      } catch (e) {
        console.warn('[segment-activity] Error:', e?.message || e);
        return { items: [], total: 0, offset: pageParam };
      }
    },
    getNextPageParam: (lastPage) => {
      const nextOffset = (lastPage.offset || 0) + 50;
      return nextOffset < (lastPage.total || 0) ? nextOffset : undefined;
    },
    enabled: !!segmentId,
    refetchOnWindowFocus: false,
  });
};

/**
 * Export segment members to CSV
 */
export const useExportSegment = () => {
  return useMutation({
    mutationFn: async (segmentId) => {
      const res = await apiClient.get(`/api/v1/segments/${segmentId}/export`, {
        responseType: 'blob',
      });
      return res.data;
    },
  });
};

// Field definitions for filter builder by object type
export const SEGMENT_FIELDS = {
  owners: [
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'blocked'] },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'firstName', label: 'First Name', type: 'text' },
    { key: 'lastName', label: 'Last Name', type: 'text' },
    { key: 'createdAt', label: 'Created Date', type: 'date' },
    { key: 'lastBookingDate', label: 'Last Booking Date', type: 'date' },
    { key: 'totalBookings', label: 'Total Bookings', type: 'number' },
    { key: 'totalSpend', label: 'Total Spend', type: 'number' },
    { key: 'petCount', label: 'Number of Pets', type: 'number' },
    { key: 'tags', label: 'Tags', type: 'multiselect' },
  ],
  pets: [
    { key: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'deceased'] },
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'species', label: 'Species', type: 'select', options: ['Dog', 'Cat', 'Other'] },
    { key: 'breed', label: 'Breed', type: 'text' },
    { key: 'sex', label: 'Sex', type: 'select', options: ['Male', 'Female', 'Unknown'] },
    { key: 'isFixed', label: 'Spayed/Neutered', type: 'boolean' },
    { key: 'createdAt', label: 'Created Date', type: 'date' },
    { key: 'birthdate', label: 'Birth Date', type: 'date' },
    { key: 'weight', label: 'Weight', type: 'number' },
    { key: 'vaccinationStatus', label: 'Vaccination Status', type: 'select', options: ['current', 'expiring', 'expired', 'missing'] },
    { key: 'lastBookingDate', label: 'Last Booking Date', type: 'date' },
    { key: 'totalBookings', label: 'Total Bookings', type: 'number' },
  ],
  bookings: [
    { key: 'status', label: 'Status', type: 'select', options: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] },
    { key: 'serviceType', label: 'Service Type', type: 'select', options: ['boarding', 'daycare', 'grooming', 'training'] },
    { key: 'startDate', label: 'Start Date', type: 'date' },
    { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'createdAt', label: 'Created Date', type: 'date' },
    { key: 'totalAmount', label: 'Total Amount', type: 'number' },
    { key: 'isPaid', label: 'Payment Status', type: 'boolean' },
  ],
};

// Operators by field type
export const OPERATORS = {
  text: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
    { value: 'greater_or_equal', label: 'greater than or equal to' },
    { value: 'less_or_equal', label: 'less than or equal to' },
    { value: 'between', label: 'is between' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  date: [
    { value: 'is', label: 'is' },
    { value: 'is_before', label: 'is before' },
    { value: 'is_after', label: 'is after' },
    { value: 'is_between', label: 'is between' },
    { value: 'in_last_days', label: 'in the last X days' },
    { value: 'more_than_days_ago', label: 'more than X days ago' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  select: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'is_any_of', label: 'is any of' },
    { value: 'is_none_of', label: 'is none of' },
  ],
  multiselect: [
    { value: 'contains_any', label: 'contains any of' },
    { value: 'contains_all', label: 'contains all of' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
  ],
};

// Object type labels
export const OBJECT_TYPES = [
  { value: 'owners', label: 'Owners' },
  { value: 'pets', label: 'Pets' },
  { value: 'bookings', label: 'Bookings' },
];

// Segment type labels
export const SEGMENT_TYPES = [
  { value: 'active', label: 'Active', description: 'Automatically updates as records change' },
  { value: 'static', label: 'Static', description: 'Fixed list of records, manually managed' },
];
