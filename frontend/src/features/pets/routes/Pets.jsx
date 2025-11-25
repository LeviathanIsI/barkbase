import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Plus, Search, Syringe, ShieldAlert, User, Calendar } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        <DirectoryListHeader title="Pets Directory" description="Manage all registered pets" />
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
        className="cursor-pointer transition-colors"
        style={{
          borderBottomWidth: '1px',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
        onClick={() => navigate(`/pets/${pet.recordId}`)}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bb-color-bg-elevated)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-6,1.5rem)]">
          <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
            <PetAvatar pet={pet} size="sm" showStatus={false} />
            <div className="min-w-0">
              <p className="font-[var(--bb-font-weight-medium,500)] text-[color:var(--bb-color-text-primary)] truncate">
                {pet.name}
              </p>
              <p className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)] truncate">
                {pet.species || 'Dog'} • {pet.breed || 'Unknown breed'}
              </p>
            </div>
          </div>
        </td>
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-6,1.5rem)]">
          <p className="text-[color:var(--bb-color-text-primary)]">
            {primaryOwner?.name || primaryOwner?.email || '—'}
          </p>
        </td>
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-6,1.5rem)]">
          <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
            <Badge variant={status === 'active' ? 'success' : 'neutral'}>
              {status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
            {inFacility && (
              <Badge variant="info">In Facility</Badge>
            )}
          </div>
        </td>
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-6,1.5rem)]">
          <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
            {hasExpiringVaccinations && (
              <div className="flex items-center gap-1 text-amber-500" title="Vaccination expiring soon">
                <Syringe className="w-4 h-4" />
                <span className="text-[var(--bb-font-size-sm,0.875rem)]">Due</span>
              </div>
            )}
            {!hasExpiringVaccinations && (
              <span className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">Current</span>
            )}
          </div>
        </td>
        <td className="py-[var(--bb-space-4,1rem)] px-[var(--bb-space-6,1.5rem)]">
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
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        <DirectoryListHeader
          title="Pets Directory"
          description="Manage all registered pets"
          actions={
            <Button variant="primary" size="sm" onClick={() => setPetFormModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pet
            </Button>
          }
        >
          {/* Stats Grid */}
          <div className="grid gap-[var(--bb-space-4,1rem)] sm:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)
            ) : (
              <>
                <Card>
                  <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
                    >
                      <PawPrint className="h-5 w-5" style={{ color: 'var(--bb-color-accent)' }} />
                    </div>
                    <div>
                      <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
                        Total Pets
                      </p>
                      <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
                        {stats.total}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                    >
                      <User className="h-5 w-5" style={{ color: 'var(--bb-color-status-positive)' }} />
                    </div>
                    <div>
                      <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
                        Active Pets
                      </p>
                      <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
                        {stats.active}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'var(--bb-color-accent-soft)' }}
                    >
                      <Calendar className="h-5 w-5" style={{ color: 'var(--bb-color-accent)' }} />
                    </div>
                    <div>
                      <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
                        With Bookings
                      </p>
                      <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
                        {stats.withBookings}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                    >
                      <ShieldAlert className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide text-[color:var(--bb-color-text-muted)]">
                        Expiring Vaccines
                      </p>
                      <p className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)] text-[color:var(--bb-color-text-primary)] leading-tight">
                        {stats.expiringVaccinations}
                      </p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Filters Card */}
          <Card>
            <div className="flex flex-col gap-[var(--bb-space-4,1rem)]">
              <div className="flex flex-col gap-[var(--bb-space-3,0.75rem)] lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform"
                    style={{ color: 'var(--bb-color-text-muted)' }}
                  />
                  <input
                    type="text"
                    placeholder="Search pets by name, breed, or owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border py-[var(--bb-space-3,0.75rem)] pl-10 pr-4 text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bb-color-bg-elevated)',
                      borderColor: 'var(--bb-color-border-subtle)',
                      color: 'var(--bb-color-text-primary)',
                    }}
                  />
                </div>

                <select
                  value={speciesFilter}
                  onChange={(e) => setSpeciesFilter(e.target.value)}
                  className="w-full rounded-lg border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2 lg:w-40"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-elevated)',
                    borderColor: 'var(--bb-color-border-subtle)',
                    color: 'var(--bb-color-text-primary)',
                  }}
                >
                  <option value="ALL">All Species</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                  <option value="other">Other</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2 lg:w-40"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-elevated)',
                    borderColor: 'var(--bb-color-border-subtle)',
                    color: 'var(--bb-color-text-primary)',
                  }}
                >
                  <option value="ALL">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="text-[var(--bb-font-size-sm,0.875rem)] text-[color:var(--bb-color-text-muted)]">
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
