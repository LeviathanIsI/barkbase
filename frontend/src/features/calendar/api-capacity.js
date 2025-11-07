import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * Get capacity data for a date range
 */
export const useCapacityQuery = (startDate, endDate) => {
  
  return useQuery({
    queryKey: ['schedule', 'capacity', startDate, endDate],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/v1/schedule/capacity', {
          params: { startDate, endDate }
        });
        // apiClient.get returns { data: ... }, so we need to extract data
        const data = response.data || [];
        return data;
      } catch (error) {
        console.error('[useCapacityQuery] Failed to fetch capacity data:', error);
        return []; // Return empty array on error
      }
    },
    enabled: !!startDate && !!endDate,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });
};

