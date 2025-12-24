/**
 * Pets API - Demo Version
 * Uses mock data instead of real API calls.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import petsData from '@/data/pets.json';
import vaccinationsData from '@/data/vaccinations.json';
import ownersData from '@/data/owners.json';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const petKeys = {
  all: ['demo', 'pets'],
  lists: () => [...petKeys.all, 'list'],
  list: (filters) => [...petKeys.lists(), filters],
  details: () => [...petKeys.all, 'detail'],
  detail: (id) => [...petKeys.details(), id],
  vaccinations: (petId) => [...petKeys.all, 'vaccinations', petId],
};

export const vaccinationKeys = {
  all: ['demo', 'vaccinations'],
  lists: () => [...vaccinationKeys.all, 'list'],
  list: (filters) => [...vaccinationKeys.lists(), filters],
  detail: (id) => [...vaccinationKeys.all, 'detail', id],
};

// ============================================================================
// MOCK DATA STORE (in-memory for mutations)
// ============================================================================

let mockPets = [...petsData];
let mockVaccinations = [...vaccinationsData];
let nextPetId = mockPets.length + 1;
let nextVaccinationId = mockVaccinations.length + 1;

// Helper to get owner for a pet
const getOwnerForPet = (ownerId) => {
  return ownersData.find((o) => o.id === ownerId);
};

// Helper to get vaccinations for a pet
const getVaccinationsForPet = (petId) => {
  return mockVaccinations.filter((v) => v.petId === petId);
};

// Calculate vaccination status summary
const getVaccinationSummary = (petId) => {
  const vaccinations = getVaccinationsForPet(petId);
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let current = 0;
  let expiringSoon = 0;
  let expired = 0;

  vaccinations.forEach((v) => {
    const expirationDate = new Date(v.expirationDate);
    if (expirationDate < now) {
      expired++;
    } else if (expirationDate <= thirtyDaysFromNow) {
      expiringSoon++;
    } else {
      current++;
    }
  });

  return { current, expiringSoon, expired, total: vaccinations.length };
};

// Helper to enrich pet with owner and vaccination info
const enrichPet = (pet) => {
  if (!pet) return null;
  const owner = getOwnerForPet(pet.ownerId);
  const vaccinationSummary = getVaccinationSummary(pet.id);

  return {
    ...pet,
    recordId: pet.id,
    owner: owner
      ? {
          id: owner.id,
          name: `${owner.firstName} ${owner.lastName}`,
          email: owner.email,
          phone: owner.phone,
        }
      : null,
    ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown',
    vaccinationSummary,
    // Calculate age from dateOfBirth
    age: pet.dateOfBirth ? calculateAge(pet.dateOfBirth) : null,
  };
};

// Helper to calculate age
const calculateAge = (dateOfBirth) => {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (years < 1) {
    const totalMonths = years * 12 + months;
    return totalMonths <= 1 ? '1 month' : `${totalMonths} months`;
  }
  return years === 1 ? '1 year' : `${years} years`;
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch all pets with optional filtering and pagination
 */
export const usePetsQuery = (options = {}) => {
  const {
    search = '',
    status = '',
    species = '',
    ownerId = '',
    page = 1,
    limit = 25,
  } = options;

  return useQuery({
    queryKey: petKeys.list({ search, status, species, ownerId, page, limit }),
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      let filtered = [...mockPets];

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (pet) =>
            pet.name?.toLowerCase().includes(searchLower) ||
            pet.breed?.toLowerCase().includes(searchLower) ||
            pet.microchipId?.toLowerCase().includes(searchLower)
        );
      }

      // Apply status filter
      if (status && status !== 'all') {
        filtered = filtered.filter((pet) => pet.status === status);
      }

      // Apply species filter
      if (species && species !== 'all') {
        filtered = filtered.filter(
          (pet) => pet.species?.toLowerCase() === species.toLowerCase()
        );
      }

      // Apply owner filter
      if (ownerId) {
        filtered = filtered.filter((pet) => pet.ownerId === ownerId);
      }

      // Enrich with owner and vaccination info
      const enriched = filtered.map(enrichPet);

      // Pagination
      const total = enriched.length;
      const totalPages = Math.ceil(total / limit);
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedData = enriched.slice(start, end);

      return {
        data: paginatedData,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
      };
    },
    staleTime: 30000,
  });
};

/**
 * Fetch a single pet by ID
 */
export const usePetQuery = (petId, options = {}) => {
  return useQuery({
    queryKey: petKeys.detail(petId),
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 200));

      const pet = mockPets.find((p) => p.id === petId);

      if (!pet) {
        throw new Error('Pet not found');
      }

      return enrichPet(pet);
    },
    enabled: !!petId && options.enabled !== false,
    staleTime: 30000,
  });
};

/**
 * Fetch pet details (alias for usePetQuery with more data)
 */
export const usePetDetailsQuery = (petId, options = {}) => {
  return useQuery({
    queryKey: [...petKeys.detail(petId), 'details'],
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 250));

      const pet = mockPets.find((p) => p.id === petId);

      if (!pet) {
        throw new Error('Pet not found');
      }

      const enriched = enrichPet(pet);
      const vaccinations = getVaccinationsForPet(petId);

      return {
        ...enriched,
        vaccinations,
      };
    },
    enabled: !!petId && options.enabled !== false,
    staleTime: 30000,
  });
};

/**
 * Fetch vaccinations for a specific pet
 */
export const usePetVaccinationsQuery = (petId, options = {}) => {
  const { statusFilter = 'all' } = options;

  return useQuery({
    queryKey: petKeys.vaccinations(petId),
    queryFn: async () => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 200));

      let vaccinations = getVaccinationsForPet(petId);

      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        vaccinations = vaccinations.filter((v) => {
          const expirationDate = new Date(v.expirationDate);
          if (statusFilter === 'expired') {
            return expirationDate < now;
          } else if (statusFilter === 'expiring_soon') {
            return expirationDate >= now && expirationDate <= thirtyDaysFromNow;
          } else if (statusFilter === 'current') {
            return expirationDate > thirtyDaysFromNow;
          }
          return true;
        });
      }

      return {
        data: vaccinations,
        meta: {
          total: vaccinations.length,
        },
      };
    },
    enabled: !!petId && options.enabled !== false,
    staleTime: 30000,
  });
};

// ============================================================================
// PET MUTATIONS
// ============================================================================

/**
 * Create a new pet
 */
export const useCreatePetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 500));

      const newPet = {
        id: `pet-${String(nextPetId++).padStart(3, '0')}`,
        ...data,
        status: data.status || 'active',
        createdAt: new Date().toISOString(),
      };

      mockPets.push(newPet);
      return enrichPet(newPet);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: petKeys.lists() });
      toast.success(`Pet "${data.name}" created successfully!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create pet');
    },
  });
};

/**
 * Update an existing pet
 */
export const useUpdatePetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId, data }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));

      const index = mockPets.findIndex((p) => p.id === petId);

      if (index === -1) {
        throw new Error('Pet not found');
      }

      mockPets[index] = {
        ...mockPets[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      return enrichPet(mockPets[index]);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: petKeys.lists() });
      queryClient.invalidateQueries({ queryKey: petKeys.detail(data.id) });
      toast.success('Pet updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update pet');
    },
  });
};

/**
 * Delete a pet
 */
export const useDeletePetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));

      const index = mockPets.findIndex((p) => p.id === petId);

      if (index === -1) {
        throw new Error('Pet not found');
      }

      const deleted = mockPets[index];
      mockPets.splice(index, 1);
      return deleted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: petKeys.lists() });
      toast.success('Pet deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete pet');
    },
  });
};

/**
 * Update pet status (quick status change)
 */
export const useUpdatePetStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId, status }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      const index = mockPets.findIndex((p) => p.id === petId);

      if (index === -1) {
        throw new Error('Pet not found');
      }

      mockPets[index] = {
        ...mockPets[index],
        status,
        updatedAt: new Date().toISOString(),
      };

      return enrichPet(mockPets[index]);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: petKeys.lists() });
      queryClient.invalidateQueries({ queryKey: petKeys.detail(data.id) });
      toast.success(`Pet status updated to "${data.status}"`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update status');
    },
  });
};

// ============================================================================
// VACCINATION MUTATIONS
// ============================================================================

/**
 * Create a new vaccination record
 */
export const useCreateVaccinationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 500));

      const pet = mockPets.find((p) => p.id === data.petId);

      const newVaccination = {
        id: nextVaccinationId++,
        ...data,
        petName: pet?.name || 'Unknown',
        status: calculateVaccinationStatus(data.expirationDate),
        createdAt: new Date().toISOString(),
      };

      mockVaccinations.push(newVaccination);
      return newVaccination;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: petKeys.vaccinations(data.petId) });
      queryClient.invalidateQueries({ queryKey: petKeys.detail(data.petId) });
      toast.success(`Vaccination "${data.vaccineName}" added successfully!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add vaccination');
    },
  });
};

/**
 * Update a vaccination record
 */
export const useUpdateVaccinationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vaccinationId, data }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));

      const index = mockVaccinations.findIndex((v) => v.id === vaccinationId);

      if (index === -1) {
        throw new Error('Vaccination not found');
      }

      mockVaccinations[index] = {
        ...mockVaccinations[index],
        ...data,
        status: calculateVaccinationStatus(data.expirationDate || mockVaccinations[index].expirationDate),
        updatedAt: new Date().toISOString(),
      };

      return mockVaccinations[index];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: petKeys.vaccinations(data.petId) });
      queryClient.invalidateQueries({ queryKey: petKeys.detail(data.petId) });
      toast.success('Vaccination updated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update vaccination');
    },
  });
};

/**
 * Delete a vaccination record
 */
export const useDeleteVaccinationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vaccinationId, petId }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 400));

      const index = mockVaccinations.findIndex((v) => v.id === vaccinationId);

      if (index === -1) {
        throw new Error('Vaccination not found');
      }

      const deleted = mockVaccinations[index];
      mockVaccinations.splice(index, 1);
      return { ...deleted, petId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: petKeys.vaccinations(data.petId) });
      queryClient.invalidateQueries({ queryKey: petKeys.detail(data.petId) });
      toast.success('Vaccination deleted successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete vaccination');
    },
  });
};

// Helper to calculate vaccination status based on expiration date
const calculateVaccinationStatus = (expirationDate) => {
  const now = new Date();
  const expiration = new Date(expirationDate);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (expiration < now) {
    return 'expired';
  } else if (expiration <= thirtyDaysFromNow) {
    return 'expiring_soon';
  }
  return 'current';
};

// ============================================================================
// INLINE UPDATE MUTATION (for DataTable inline editing)
// ============================================================================

export const useInlineUpdatePetMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId, field, value }) => {
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 300));

      const index = mockPets.findIndex((p) => p.id === petId);

      if (index === -1) {
        throw new Error('Pet not found');
      }

      mockPets[index] = {
        ...mockPets[index],
        [field]: value,
        updatedAt: new Date().toISOString(),
      };

      return enrichPet(mockPets[index]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: petKeys.lists() });
      // Silent success for inline edits
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update');
    },
  });
};

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export { mockPets, mockVaccinations, getVaccinationsForPet, enrichPet };
