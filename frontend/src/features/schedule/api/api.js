import apiClient from "@/lib/apiClient";
import { useQuery } from "@tanstack/react-query";
import { canonicalEndpoints } from "@/lib/canonicalEndpoints";

/**
 * Fetch today's schedule/bookings
 * @param {Date} date - The date to fetch schedule for
 */
export function useTodaysSchedule(date = new Date()) {
  const dateStr = date.toISOString().split('T')[0];

  return useQuery({
    queryKey: ["schedule", dateStr],
    queryFn: async () => {
      const response = await apiClient.get(
        `${canonicalEndpoints.schedule.list}?from=${dateStr}&to=${dateStr}`
      );
      return response.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch schedule for a date range
 */
export function useSchedule(startDate, endDate) {
  return useQuery({
    queryKey: ["schedule", startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get(
        `${canonicalEndpoints.schedule.list}?from=${startDate}&to=${endDate}`
      );
      return response.data || [];
    },
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch capacity data for date range
 */
export function useCapacity(startDate, endDate) {
  return useQuery({
    queryKey: ["schedule", "capacity", startDate, endDate],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.schedule.capacity, {
        params: { startDate, endDate }
      });
      // apiClient.get returns { data: ... }, so extract data
      return response.data || [];
    },
    enabled: !!startDate && !!endDate,
    staleTime: 1000 * 60 * 5,
    initialData: []
  });
}

