import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Plus, Search, Syringe, ShieldAlert, User, FileText, Calendar, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import { usePetsQuery, useCreatePetMutation } from '../api';
import { useExpiringVaccinationsQuery } from '../api-vaccinations';
import { PetFormModal } from '../components';
import EmptyStatePets from '../components/EmptyStatePets';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { PanelSection } from '@/components/layout/PanelSection';
import { PropertyList } from '@/components/ui/PropertyList';
import { EmptyState } from '@/components/ui/EmptyState';
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
  const [selectedPet, setSelectedPet] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // REAL API DATA - preserved from existing implementation
  const { data: petsResult, isLoading: isLoadingData, error } = usePetsQuery();
  const pets = petsResult?.pets ?? [];
  const createPetMutation = useCreatePetMutation();

  // Prevent flash of loading state - only show loading if it takes more than 100ms
  const [showLoading, setShowLoading] = useState(false);
  
  useState(() => {
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
        onClick={() => setSelectedPet(pet)}
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


  // Show empty state if no pets exist at all (not just filtered)
  const showEmptyState = !isLoading && pets.length === 0;

  // Left Panel - Filters
  const renderLeftPanel = () => (
    <div className="space-y-4">
      {/* Essential Filters */}
      <PanelSection
        title="Filters"
        collapsible
        defaultOpen
        storageKey="pets-filters"
      >
        <div className="space-y-4">
          {/* Species Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary uppercase tracking-wide mb-2 block">
              Species
            </label>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
            >
              <option value="ALL">All Species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary uppercase tracking-wide mb-2 block">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md text-sm bg-white dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </PanelSection>

      {/* Advanced Filters - Collapsed by default */}
      <PanelSection
        title="Advanced Filters"
        collapsible
        defaultOpen={false}
        storageKey="pets-advanced-filters"
      >
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
            Additional filter options available in the full pet details view.
          </div>
        </div>
      </PanelSection>
    </div>
  );

  // Right Panel - Pet Details
  const renderRightPanel = () => {
    if (!selectedPet) {
      return (
        <EmptyState
          icon={PawPrint}
          title="No Pet Selected"
          description="Select a pet from the list to view details"
        />
      );
    }

    const primaryOwner = selectedPet.owners?.[0];
    const hasExpiringVaccinations = expiringVaccsData?.some(v => v.petId === selectedPet.recordId);

    return (
      <div className="h-full overflow-y-auto">
        {/* Pet Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center gap-4 mb-4">
            <PetAvatar pet={selectedPet} size="lg" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
                {selectedPet.name}
              </h2>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                {selectedPet.species || 'Dog'} • {selectedPet.breed || 'Unknown breed'}
              </p>
              {hasExpiringVaccinations && (
                <div className="flex items-center gap-1 mt-1 text-warning-600">
                  <Syringe className="w-4 h-4" />
                  <span className="text-sm">Vaccination due</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="primary" 
              className="flex-1" 
              onClick={() => navigate(`/pets/${selectedPet.recordId}`)}
            >
              <FileText className="h-4 w-4 mr-1" />
              View Full Details
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Calendar className="h-4 w-4 mr-1" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Key Information */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-3">
              Basic Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Status</span>
                <Badge variant={selectedPet.status === 'active' ? 'success' : 'neutral'}>
                  {selectedPet.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              {selectedPet.age && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Age</span>
                  <span className="text-sm text-gray-900 dark:text-dark-text-primary">
                    {selectedPet.age} years
                  </span>
                </div>
              )}
              {selectedPet.weight && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Weight</span>
                  <span className="text-sm text-gray-900 dark:text-dark-text-primary">
                    {selectedPet.weight} lbs
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Owner Info */}
          {primaryOwner && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-3">
                Owner Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Name</span>
                  <span className="text-sm text-gray-900 dark:text-dark-text-primary">
                    {primaryOwner.name || primaryOwner.email}
                  </span>
                </div>
                {primaryOwner.phone && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Phone</span>
                    <span className="text-sm text-gray-900 dark:text-dark-text-primary">
                      {primaryOwner.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Medical Notes - Only if present */}
          {(selectedPet.medicalNotes || selectedPet.dietaryNotes) && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary mb-3">
                Important Notes
              </h3>
              {selectedPet.medicalNotes && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30 rounded-lg p-3 mb-2">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    <strong>Medical:</strong> {selectedPet.medicalNotes}
                  </p>
                </div>
              )}
              {selectedPet.dietaryNotes && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Dietary:</strong> {selectedPet.dietaryNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <DirectoryListHeader
        breadcrumb="Home > Clients > Pets"
        title="Pets"
        actions={
          !showEmptyState && !isLoading && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setPetFormModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Pet
            </Button>
          )
        }
      >
        {!showEmptyState && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search pets by name, breed, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-dark-border dark:bg-dark-bg-tertiary dark:text-dark-text-primary"
              />
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-dark-text-secondary">
              <p>Showing {filteredPets.length} of {pets.length} pets</p>
            </div>
          </>
        )}
      </DirectoryListHeader>

      {showEmptyState ? (
        <EmptyStatePets
          onAddPet={() => setPetFormModalOpen(true)}
          onImport={() => {}}
        />
      ) : (
        <ThreePanelLayout
          left={renderLeftPanel()}
          showLeftPanel={true}
          showRightPanel={!!selectedPet}
          right={renderRightPanel()}
          center={
            <div className="space-y-6 p-6">
              {isLoading ? (
                <DirectoryTableSkeleton />
              ) : filteredPets.length === 0 ? (
                <DirectoryEmptyState
                  title="No Pets Found"
                  description={
                    searchTerm || statusFilter !== 'ALL' || speciesFilter !== 'ALL'
                      ? 'Try adjusting your search or filters.'
                      : 'Get started by adding your first pet.'
                  }
                  icon={PawPrint}
                >
                  <Button onClick={() => setPetFormModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pet
                  </Button>
                </DirectoryEmptyState>
              ) : (
                <PetsListTable
                  pets={filteredPets}
                  renderRow={(pet) => <PetTableRow key={pet.recordId} pet={pet} />}
                />
              )}
            </div>
          }
        />
      )}

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
    </div>
  );
};

export default Pets;
