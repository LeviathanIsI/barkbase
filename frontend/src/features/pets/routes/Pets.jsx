import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Plus, Search, Syringe, ShieldAlert, User, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import { Card } from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { usePetsQuery, useCreatePetMutation } from '../api';
import { useExpiringVaccinationsQuery } from '../api-vaccinations';
import { PetFormModal } from '../components';
import DirectoryListHeader from '@/features/directory/components/DirectoryListHeader';
import DirectoryEmptyState from '@/features/directory/components/DirectoryEmptyState';
import DirectoryErrorState from '@/features/directory/components/DirectoryErrorState';
import { DirectoryTableSkeleton } from '@/features/directory/components/DirectorySkeleton';
import PetsListTable from '@/features/directory/components/PetsListTable';

/**
 * ACTUAL DATA STRUCTURE (from API - usePetsQuery):
 * pets: Array<{
 *   recordId: string,
 *   name: string,
 *   species: string,
 *   breed: string,
 *   age: number,
 *   weight: number,
 *   gender: string,
 *   color: string,
 *   status: 'active' | 'inactive',
 *   microchip: string,
 *   owners: Array<{ id, name, email, phone }>,
 *   bookings: Array<{ id, checkIn, checkOut }>,
 *   medicalNotes: string,
 *   dietaryNotes: string,
 *   behaviorNotes: string,
 *   specialNeeds: string,
 *   emergencyContact: { name, phone, relationship },
 *   createdAt: string,
 * }>
 */
// TODO (C1:4 - Directory Query Consolidation): Convert to unified DirectorySnapshot hook.
const Pets = () => {
  const navigate = useNavigate();
  const [petFormModalOpen, setPetFormModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [speciesFilter, setSpeciesFilter] = useState('ALL');
  // REAL API DATA - preserved from existing implementation
  const { data: petsResult, isLoading: isLoadingData, error } = usePetsQuery();
  const pets = petsResult?.pets ?? [];
  const createPetMutation = useCreatePetMutation();

  // Prevent flash of loading state - only show loading if it takes more than 100ms
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeout;
    if (isLoadingData) {
      timeout = setTimeout(() => setShowLoading(true), 100);
    } else {
      setShowLoading(false);
    }
    return () => clearTimeout(timeout);
  }, [isLoadingData]);

  const isLoading = isLoadingData && showLoading;

  // Filter pets based on search and filters
  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
      const matchesSearch = !searchTerm ||
        pet.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.owners?.some(owner =>
          owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          owner.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesStatus = statusFilter === 'ALL' || (pet.status || 'active') === statusFilter;
      const matchesSpecies = speciesFilter === 'ALL' || (pet.species || 'dog').toLowerCase() === speciesFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSpecies;
    });
  }, [pets, searchTerm, statusFilter, speciesFilter]);

  // Get real expiring vaccinations data
  const { data: expiringVaccsData } = useExpiringVaccinationsQuery(30);
  
  // Calculate stats
  const stats = useMemo(() => {
    const activePets = pets.filter(p => (p.status || 'active') === 'active');
    const expiringVaccinations = expiringVaccsData?.length || 0;
    
    return {
      total: pets.length,
      active: activePets.length,
      inactive: pets.filter(p => p.status === 'inactive').length,
      withBookings: pets.filter(p => p.bookings?.length > 0).length,
      expiringVaccinations
    };
  }, [pets, expiringVaccsData]);

  if (error) {
    return (
      <div className="space-y-6">
        <DirectoryListHeader title="Pets" breadcrumb="Home > Clients > Pets" />
        <DirectoryErrorState message="Unable to load pets data. Please try again." />
      </div>
    );
  }

  // Pet Table Row Component
  const PetTableRow = ({ pet }) => {
    const primaryOwner = pet.owners?.[0];
    const status = pet.status || 'active';
    const hasExpiringVaccinations = expiringVaccsData?.some(v => v.petId === pet.recordId);
    const inFacility = pet.bookings?.some(b => 
      new Date(b.checkIn) <= new Date() && new Date(b.checkOut) >= new Date()
    );

    return (
      <tr
        className="border-b border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary cursor-pointer transition-colors"
        onClick={() => navigate(`/pets/${pet.recordId}`)}
      >
        <td className="py-4 px-6">
          <div className="flex items-center gap-3">
            <PetAvatar pet={pet} size="sm" showStatus={false} />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-dark-text-primary truncate">
                {pet.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary truncate">
                {pet.species || 'Dog'} • {pet.breed || 'Unknown breed'}
              </p>
            </div>
          </div>
        </td>
        <td className="py-4 px-6">
          <p className="text-gray-900 dark:text-dark-text-primary">
            {primaryOwner?.name || primaryOwner?.email || '—'}
          </p>
        </td>
        <td className="py-4 px-6">
          <div className="flex items-center gap-2">
            <Badge variant={status === 'active' ? 'success' : 'neutral'}>
              {status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
            {inFacility && (
              <Badge variant="info">In Facility</Badge>
            )}
          </div>
        </td>
        <td className="py-4 px-6">
          <div className="flex items-center gap-2">
            {hasExpiringVaccinations && (
              <div className="flex items-center gap-1 text-warning-600" title="Vaccination expiring soon">
                <Syringe className="w-4 h-4" />
                <span className="text-sm">Due</span>
              </div>
            )}
            {!hasExpiringVaccinations && (
              <span className="text-sm text-gray-500 dark:text-dark-text-secondary">Current</span>
            )}
          </div>
        </td>
        <td className="py-4 px-6">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/pets/${pet.recordId}`);
            }}
          >
            View
          </Button>
        </td>
      </tr>
    );
  };

  const emptyDescription =
    searchTerm || statusFilter !== 'ALL' || speciesFilter !== 'ALL'
      ? 'Try adjusting your search or filters.'
      : 'Get started by adding your first pet.';

  return (
    <>
      <div className="space-y-6">
        <DirectoryListHeader
          breadcrumb="Home > Clients > Pets"
          title="Pets Directory"
          actions={
            <Button variant="secondary" size="sm" onClick={() => setPetFormModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pet
            </Button>
          }
        >
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
            ) : (
              <>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Total Pets</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.total}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 dark:bg-surface-secondary">
                      <PawPrint className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Active Pets</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.active}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-surface-secondary">
                      <User className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">With Bookings</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.withBookings}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-surface-secondary">
                      <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">Expiring Vaccinations</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.expiringVaccinations}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-surface-secondary">
                      <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          <Card className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search pets by name, breed, or owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-border dark:bg-dark-bg-tertiary dark:text-dark-text-primary"
                  />
                </div>

                <select
                  value={speciesFilter}
                  onChange={(e) => setSpeciesFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-border dark:bg-dark-bg-tertiary dark:text-dark-text-primary lg:w-48"
                >
                  <option value="ALL">All Species</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                  <option value="other">Other</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-border dark:bg-dark-bg-tertiary dark:text-dark-text-primary lg:w-48"
                >
                  <option value="ALL">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                Showing {filteredPets.length} of {pets.length} pets
              </div>
            </div>
          </Card>
        </DirectoryListHeader>

        {isLoading ? (
          <DirectoryTableSkeleton />
        ) : filteredPets.length === 0 ? (
          <DirectoryEmptyState title="No Pets Found" description={emptyDescription} icon={PawPrint}>
            <Button onClick={() => setPetFormModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pet
            </Button>
          </DirectoryEmptyState>
        ) : (
          <PetsListTable pets={filteredPets} renderRow={(pet) => <PetTableRow key={pet.recordId} pet={pet} />} />
        )}
      </div>

      <PetFormModal
        open={petFormModalOpen}
        onClose={() => setPetFormModalOpen(false)}
        onSubmit={async (data) => {
          try {
            await createPetMutation.mutateAsync(data);
            setPetFormModalOpen(false);
          } catch (error) {
            console.error('Failed to create pet:', error);
            // Error handling will be shown in the form
          }
        }}
        isLoading={createPetMutation.isPending}
      />
    </>
  );
};

export default Pets;
