/**
 * Pets Vaccinations API - Demo Version
 * Uses mock data instead of real API calls.
 */

import { useQuery } from '@tanstack/react-query';
import vaccinationsData from '@/data/vaccinations.json';
import petsData from '@/data/pets.json';
import ownersData from '@/data/owners.json';

/**
 * Get expiring vaccinations
 *
 * Returns vaccination records with status based on expiration date
 *
 * @param {number} daysAhead - Number of days ahead to check for expiring vaccinations
 * @param {string} statusFilter - Filter by record status: 'active', 'archived', or 'all'
 * @param {object} options - React Query options
 */
export const useExpiringVaccinationsQuery = (daysAhead = 30, statusFilter = 'all', options = {}) => {
  return useQuery({
    queryKey: ['demo', 'vaccinations', 'expiring', daysAhead, statusFilter],
    enabled: options.enabled !== false,
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 200));

      const now = new Date();
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      // Enrich vaccinations with pet and owner info
      const enrichedVaccinations = vaccinationsData.map((vacc) => {
        const pet = petsData.find((p) => p.id === vacc.petId);
        const owner = pet ? ownersData.find((o) => o.id === pet.ownerId) : null;

        const expiresAt = vacc.expirationDate || vacc.expiresAt;
        const expirationDate = expiresAt ? new Date(expiresAt) : null;

        // Calculate status based on expiration
        let status = 'current';
        if (expirationDate) {
          if (expirationDate < now) {
            status = 'expired';
          } else if (expirationDate <= futureDate) {
            status = 'expiring';
          }
        }

        return {
          id: vacc.id,
          recordId: vacc.id,
          petId: vacc.petId,
          petName: pet?.name || 'Unknown',
          ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
          type: vacc.vaccineName || vacc.type || vacc.name,
          name: vacc.vaccineName || vacc.type || vacc.name,
          vaccineName: vacc.vaccineName || vacc.type || vacc.name,
          administeredAt: vacc.administeredDate || vacc.administeredAt,
          expiresAt: expiresAt,
          expirationDate: expiresAt,
          provider: vacc.provider || vacc.veterinarian,
          status,
        };
      });

      // Filter by status if needed (not 'all')
      let filtered = enrichedVaccinations;
      if (statusFilter && statusFilter !== 'all') {
        filtered = enrichedVaccinations.filter((v) => v.status === statusFilter);
      }

      // Filter to only expiring/expired within daysAhead
      const expiringVaccinations = filtered.filter((v) => {
        if (!v.expiresAt) return false;
        const expirationDate = new Date(v.expiresAt);
        // Include expired and expiring within daysAhead
        return expirationDate <= futureDate;
      });

      return expiringVaccinations;
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};
