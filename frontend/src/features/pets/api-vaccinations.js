import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';

/**
 * Get expiring vaccinations
 */
export const useExpiringVaccinationsQuery = (daysAhead = 30, options = {}) => {
  return useQuery({
    queryKey: ['vaccinations', 'expiring', daysAhead],
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.pets.expiringVaccinations, {
        params: { daysAhead }
      });
      return response.data;
    },
    ...options,
  });
};

