import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';

/**
 * Get capacity data for a date range
 */
export const useCapacityQuery = (startDate, endDate) => {
  console.log('[useCapacityQuery] Called with:', { startDate, endDate, enabled: !!startDate && !!endDate });
  
  return useQuery({
    queryKey: ['schedule', 'capacity', startDate, endDate],
    queryFn: async () => {
      try {
        console.log('[useCapacityQuery] Fetching from API...');
        const response = await apiClient.get('/api/v1/schedule/capacity', {
          params: { startDate, endDate }
        });
        console.log('[useCapacityQuery] API response:', response);
        // apiClient.get returns { data: ... }, so we need to extract data
        const data = response.data || [];
        console.log('[useCapacityQuery] Extracted data:', data);
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

