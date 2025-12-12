/**
 * Time Clock React Query Hooks
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as timeClockApi from '../api-timeclock';

// Query keys
export const timeClockKeys = {
  all: ['timeClock'],
  status: () => [...timeClockKeys.all, 'status'],
  entries: (params) => [...timeClockKeys.all, 'entries', params],
  entry: (id) => [...timeClockKeys.all, 'entry', id],
};

/**
 * Hook to get current time clock status
 */
export function useTimeStatus(options = {}) {
  return useQuery({
    queryKey: timeClockKeys.status(),
    queryFn: async () => {
      const response = await timeClockApi.getTimeStatus();
      return response;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for live updates
    ...options,
  });
}

/**
 * Hook to get time entries
 */
export function useTimeEntries(params = {}, options = {}) {
  return useQuery({
    queryKey: timeClockKeys.entries(params),
    queryFn: async () => {
      const response = await timeClockApi.getTimeEntries(params);
      return response;
    },
    ...options,
  });
}

/**
 * Hook to clock in
 */
export function useClockIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data = {}) => timeClockApi.clockIn(data),
    onSuccess: () => {
      // Invalidate status query to refetch
      queryClient.invalidateQueries({ queryKey: timeClockKeys.status() });
      queryClient.invalidateQueries({ queryKey: timeClockKeys.all });
    },
  });
}

/**
 * Hook to clock out
 */
export function useClockOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data = {}) => timeClockApi.clockOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeClockKeys.status() });
      queryClient.invalidateQueries({ queryKey: timeClockKeys.all });
    },
  });
}

/**
 * Hook to start break
 */
export function useStartBreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data = {}) => timeClockApi.startBreak(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeClockKeys.status() });
    },
  });
}

/**
 * Hook to end break
 */
export function useEndBreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data = {}) => timeClockApi.endBreak(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeClockKeys.status() });
    },
  });
}

/**
 * Hook to update time entry
 */
export function useUpdateTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, data }) => timeClockApi.updateTimeEntry(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeClockKeys.all });
    },
  });
}

/**
 * Hook to delete time entry
 */
export function useDeleteTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId) => timeClockApi.deleteTimeEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeClockKeys.all });
    },
  });
}

/**
 * Hook to approve time entry
 */
export function useApproveTimeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, data }) => timeClockApi.approveTimeEntry(entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeClockKeys.all });
    },
  });
}

export default {
  useTimeStatus,
  useTimeEntries,
  useClockIn,
  useClockOut,
  useStartBreak,
  useEndBreak,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
  useApproveTimeEntry,
};
