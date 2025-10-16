import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

/**
 * Get expiring vaccinations
 */
export const useExpiringVaccinationsQuery = (daysAhead = 30) => {
  return useQuery({
    queryKey: ['vaccinations', 'expiring', daysAhead],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/pets/vaccinations/expiring', {
        params: { daysAhead }
      });
      return response.data;
    }
  });
};

