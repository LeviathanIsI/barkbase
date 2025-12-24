import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/apiClient';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';

const useTenantKey = () => useTenantStore((state) => state.tenant?.slug ?? 'default');

const useTenantReady = () => {
  const tenantId = useAuthStore((state) => state.tenantId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated && Boolean(tenantId);
};

/**
 * Get expiring vaccinations
 *
 * Backend returns: { data: [...], items: [...], total: N, daysAhead: N }
 * Each item: { id, petId, petName, ownerName, type, administeredAt, expiresAt, provider, status }
 *
 * @param {number} daysAhead - Number of days ahead to check for expiring vaccinations
 * @param {string} statusFilter - Filter by record status: 'active', 'archived', or 'all'
 * @param {object} options - React Query options
 */
export const useExpiringVaccinationsQuery = (daysAhead = 30, statusFilter = 'all', options = {}) => {
  const tenantKey = useTenantKey();
  const isTenantReady = useTenantReady();

  return useQuery({
    queryKey: ['vaccinations', 'expiring', tenantKey, daysAhead, statusFilter],
    enabled: isTenantReady && (options.enabled !== false),
    queryFn: async () => {
      const response = await apiClient.get(canonicalEndpoints.pets.expiringVaccinations, {
        params: { daysAhead, statusFilter }
      });
      const data = response?.data;
      // Normalize response to array
      const vaccinations = data?.data || data?.items || (Array.isArray(data) ? data : []);
      return vaccinations;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
