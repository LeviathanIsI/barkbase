import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/**
 * Get capacity data for a date range
 */
export const useCapacityQuery = (startDate, endDate) => {
  return useQuery({
    queryKey: ['calendar', 'capacity', startDate, endDate],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/api/v1/calendar/capacity', {
          params: { startDate, endDate }
        });
        return response.data || [];
      } catch (error) {
        console.error('Failed to fetch capacity data:', error);
        return []; // Return empty array on error
      }
    },
    enabled: !!startDate && !!endDate,
    initialData: [] // Provide initial data to prevent undefined
  });
};

