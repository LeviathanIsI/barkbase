/**
 * Demo Vaccinations API
 * Provides mock data hooks for vaccination management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import petsData from '@/data/pets.json';
import ownersData from '@/data/owners.json';
import toast from 'react-hot-toast';

// ============================================================================
// DATE HELPERS
// ============================================================================

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDate = (date) => date.toISOString().split('T')[0];

// ============================================================================
// GENERATE MOCK VACCINATION DATA
// ============================================================================

let vaccinationsStore = null;

const generateVaccinations = () => {
  if (vaccinationsStore) return vaccinationsStore;

  const today = new Date();
  const vaccineTypes = ['Rabies', 'DAPP', 'Bordetella', 'Leptospirosis', 'FVRCP', 'FeLV'];

  const vaccinations = [];
  let id = 1;

  petsData.forEach((pet) => {
    const owner = ownersData.find((o) => o.id === pet.ownerId);
    const species = pet.species?.toLowerCase() || 'dog';

    // Filter vaccines by species
    const applicableVaccines = vaccineTypes.filter((v) => {
      if (species === 'cat') return ['Rabies', 'FVRCP', 'FeLV'].includes(v);
      return ['Rabies', 'DAPP', 'Bordetella', 'Leptospirosis'].includes(v);
    });

    // Create 2-3 vaccination records per pet
    const numVaccines = Math.min(applicableVaccines.length, 2 + Math.floor(Math.random() * 2));

    for (let i = 0; i < numVaccines; i++) {
      const vaccineType = applicableVaccines[i];

      // Random expiry: some expired, some expiring soon, some current
      let daysOffset;
      const rand = Math.random();
      if (rand < 0.15) {
        daysOffset = -Math.floor(Math.random() * 30); // Expired
      } else if (rand < 0.35) {
        daysOffset = Math.floor(Math.random() * 14); // Expiring soon (0-14 days)
      } else if (rand < 0.55) {
        daysOffset = 14 + Math.floor(Math.random() * 30); // Expiring (14-44 days)
      } else {
        daysOffset = 60 + Math.floor(Math.random() * 300); // Current (60+ days)
      }

      const expiresAt = addDays(today, daysOffset);
      const administeredAt = addDays(expiresAt, -365); // Assume 1 year validity

      vaccinations.push({
        id: `vax-${id++}`,
        petId: pet.id,
        petName: pet.name,
        petSpecies: pet.species,
        petBreed: pet.breed,
        ownerId: pet.ownerId,
        ownerFirstName: owner?.firstName || 'Unknown',
        ownerLastName: owner?.lastName || '',
        ownerEmail: owner?.email,
        ownerPhone: owner?.phone,
        type: vaccineType,
        administeredAt: formatDate(administeredAt),
        expiresAt: formatDate(expiresAt),
        provider: 'Local Vet Clinic',
        lotNumber: `LOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        notes: '',
        recordStatus: 'active',
      });
    }
  });

  vaccinationsStore = vaccinations;
  return vaccinations;
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get expiring vaccinations within a given number of days
 */
export const useExpiringVaccinationsQuery = (maxDays = 30, statusFilter = 'active') => {
  return useQuery({
    queryKey: ['demo', 'vaccinations', 'expiring', maxDays, statusFilter],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 200));

      const today = new Date();
      const vaccinations = generateVaccinations();

      return vaccinations.map((v) => {
        const expiresAt = new Date(v.expiresAt);
        const daysRemaining = Math.ceil((expiresAt - today) / (1000 * 60 * 60 * 24));

        let status = 'current';
        if (daysRemaining < 0) status = 'overdue';
        else if (daysRemaining <= 7) status = 'critical';
        else if (daysRemaining <= 30) status = 'expiring';

        return {
          ...v,
          daysRemaining,
          status,
          ownerName: `${v.ownerFirstName} ${v.ownerLastName}`.trim(),
        };
      });
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Get vaccination records for a specific pet
 */
export const usePetVaccinationsQuery = (petId) => {
  return useQuery({
    queryKey: ['demo', 'vaccinations', 'pet', petId],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 100));
      const vaccinations = generateVaccinations();
      return vaccinations.filter((v) => v.petId === petId);
    },
    enabled: !!petId,
  });
};

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Renew a vaccination
 */
export const useRenewVaccinationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vaccinationId, newExpiryDate }) => {
      await new Promise((r) => setTimeout(r, 500));

      // Update in store
      if (vaccinationsStore) {
        const vax = vaccinationsStore.find((v) => v.id === vaccinationId);
        if (vax) {
          vax.expiresAt = newExpiryDate;
          vax.administeredAt = formatDate(new Date());
        }
      }

      return { id: vaccinationId, expiresAt: newExpiryDate };
    },
    onSuccess: () => {
      toast.success('Vaccination renewed successfully!');
      queryClient.invalidateQueries({ queryKey: ['demo', 'vaccinations'] });
    },
  });
};

/**
 * Delete a vaccination record
 */
export const useDeleteVaccinationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vaccinationId) => {
      await new Promise((r) => setTimeout(r, 300));

      if (vaccinationsStore) {
        vaccinationsStore = vaccinationsStore.filter((v) => v.id !== vaccinationId);
      }

      return vaccinationId;
    },
    onSuccess: () => {
      toast.success('Vaccination record deleted');
      queryClient.invalidateQueries({ queryKey: ['demo', 'vaccinations'] });
    },
  });
};
