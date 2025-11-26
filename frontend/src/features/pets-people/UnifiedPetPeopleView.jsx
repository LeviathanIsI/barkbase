import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Users, PawPrint, LayoutGrid, List, X, Filter } from 'lucide-react';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/apiClient';
import UnifiedOwnerCard from '@/features/directory/components/UnifiedOwnerCard';
import DirectoryEmptyState from '@/features/directory/components/DirectoryEmptyState';
import DirectoryErrorState from '@/features/directory/components/DirectoryErrorState';
import { DirectoryTableSkeleton } from '@/features/directory/components/DirectorySkeleton';
import { cn } from '@/lib/cn';

/**
 * UnifiedPetPeopleView Component
 * HubSpot-grade CRM interface for managing owners and pets
 */
const UnifiedPetPeopleView = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const { data: owners = [], isLoading, error } = useQuery({
    queryKey: ['owners', 'with-pets'],
    queryFn: async () => {
      const ownersResponse = await apiClient.get('/api/v1/owners?expand=pets');
      const normalizeList = (response) => {
        if (!response) return [];
        if (Array.isArray(response.data)) return response.data;
        if (Array.isArray(response.data?.data)) return response.data.data;
        return [];
      };
      const ownersList = normalizeList(ownersResponse);

      if (ownersList.length > 0 && !ownersList[0].pets) {
        const petsResponse = await apiClient.get('/api/v1/pets');
        const petsList = normalizeList(petsResponse);

        return ownersList.map((owner) => {
          const ownerPets = petsList.filter((pet) => {
            if (pet.ownerId === owner.id || pet.owner_id === owner.id) return true;
            if (pet.owners?.some((o) => o.id === owner.id)) return true;
            if (pet.primaryOwnerId === owner.id || pet.primary_owner_id === owner.id) return true;
            return false;
          });

          return {
            ...owner,
            pets: ownerPets,
            activePets: ownerPets.filter((pet) => pet.status !== 'inactive'),
          };
        });
      }

      return ownersList.map((owner) => {
        const ownerPets = owner.pets || [];
        return {
          ...owner,
          pets: ownerPets,
          activePets: ownerPets.filter((pet) => pet.status !== 'inactive'),
        };
      });
    },
    refetchInterval: 60000,
  });

  const filteredOwners = useMemo(() => {
    return owners.filter((owner) => {
      const matchesSearch =
        !searchTerm ||
        owner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.phone?.includes(searchTerm) ||
        owner.pets?.some((pet) => pet.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      const hasActivePets = owner.activePets?.length > 0;
      const matchesFilter =
        filterType === 'all' ||
        (filterType === 'active' && hasActivePets) ||
        (filterType === 'inactive' && !hasActivePets);

      return matchesSearch && matchesFilter;
    });
  }, [owners, searchTerm, filterType]);

  const stats = useMemo(
    () => ({
      totalOwners: owners.length,
      activeOwners: owners.filter((o) => o.activePets?.length > 0).length,
      totalPets: owners.reduce((sum, o) => sum + (o.pets?.length || 0), 0),
      activePets: owners.reduce((sum, o) => sum + (o.activePets?.length || 0), 0),
    }),
    [owners]
  );

  const getVaccinationStatus = (pet) => {
    if (!pet.lastVaccinationDate) return 'missing';
    const daysSince = Math.floor((Date.now() - new Date(pet.lastVaccinationDate)) / (1000 * 60 * 60 * 24));
    if (daysSince > 365) return 'expired';
    if (daysSince > 335) return 'due-soon';
    return 'current';
  };

  const hasActiveFilters = filterType !== 'all' || searchTerm;
  const filterLabel = filterType === 'all' ? 'All Clients' : filterType === 'active' ? 'Active Clients' : 'Inactive Clients';

  const clearFilters = () => {
    setFilterType('all');
    setSearchTerm('');
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader stats={stats} />
        <DirectoryErrorState message="Unable to load pets & people data. Please try again." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Stats + Actions */}
      <PageHeader stats={stats} />

      {/* Search & Filter Row */}
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Search Input with Label */}
          <div className="flex-1">
            <label
              htmlFor="client-search"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]"
            >
              Search Clients & Pets
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--bb-color-text-muted)]" />
              <input
                id="client-search"
                type="text"
                placeholder="Search by name, email, phone, or pet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
                style={{
                  backgroundColor: 'var(--bb-color-bg-body)',
                  borderColor: 'var(--bb-color-border-subtle)',
                  color: 'var(--bb-color-text-primary)',
                }}
                aria-label="Search clients and pets"
              />
            </div>
          </div>

          {/* Filter Dropdown */}
          <div>
            <label
              htmlFor="client-filter"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]"
            >
              Filter
            </label>
            <select
              id="client-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full min-w-[140px] rounded-lg border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
              style={{
                backgroundColor: 'var(--bb-color-bg-body)',
                borderColor: 'var(--bb-color-border-subtle)',
                color: 'var(--bb-color-text-primary)',
              }}
              aria-label="Filter clients"
            >
              <option value="all">All Clients</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* View Toggle - Segmented Buttons */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
              View
            </label>
            <div
              className="inline-flex rounded-lg border p-1"
              style={{ backgroundColor: 'var(--bb-color-bg-body)', borderColor: 'var(--bb-color-border-subtle)' }}
              role="group"
              aria-label="View mode"
            >
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'flex items-center justify-center rounded-md px-3 py-1.5 transition-all',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]',
                  viewMode === 'grid'
                    ? 'bg-[color:var(--bb-color-accent)] text-white shadow-sm'
                    : 'text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)]'
                )}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'flex items-center justify-center rounded-md px-3 py-1.5 transition-all',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]',
                  viewMode === 'list'
                    ? 'bg-[color:var(--bb-color-accent)] text-white shadow-sm'
                    : 'text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:bg-[color:var(--bb-color-bg-elevated)]'
                )}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Tag Summary */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <Filter className="h-3.5 w-3.5 text-[color:var(--bb-color-text-muted)]" />
            <span className="text-sm text-[color:var(--bb-color-text-muted)]">
              Showing: <strong className="text-[color:var(--bb-color-text-primary)]">{filterLabel}</strong>
              {searchTerm && (
                <>
                  {' '}matching "<strong className="text-[color:var(--bb-color-text-primary)]">{searchTerm}</strong>"
                </>
              )}
              <span className="ml-1 text-[color:var(--bb-color-text-muted)]">
                ({filteredOwners.length} result{filteredOwners.length !== 1 ? 's' : ''})
              </span>
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[color:var(--bb-color-accent)] hover:bg-[color:var(--bb-color-accent-soft)] transition-colors"
              aria-label="Clear all filters"
            >
              <X className="h-3 w-3" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <DirectoryTableSkeleton />
      ) : filteredOwners.length > 0 ? (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid gap-x-6 gap-y-8 md:grid-cols-2 xl:grid-cols-3'
              : 'space-y-4'
          )}
        >
          {filteredOwners.map((owner, index) => (
            <UnifiedOwnerCard
              key={owner.id || owner.recordId || index}
              owner={owner}
              getVaccinationStatus={getVaccinationStatus}
              viewMode={viewMode}
            />
          ))}
        </div>
      ) : (
        <DirectoryEmptyState
          title="No clients found"
          description={searchTerm ? `No results for "${searchTerm}"` : 'Start by adding your first client.'}
          icon={Users}
        >
          {!searchTerm && (
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              Add First Client
            </Button>
          )}
        </DirectoryEmptyState>
      )}
    </div>
  );
};

// Page Header Component with Stats and Actions
const PageHeader = ({ stats }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    {/* Left: Title + Stats */}
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)]">Pets & People</h1>
        <p className="mt-0.5 text-sm text-[color:var(--bb-color-text-muted)]">
          Manage your clients and their furry friends
        </p>
      </div>

      {/* Stats Row - Pill Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <StatBadge icon={Users} label="Total Owners" value={stats.totalOwners} variant="neutral" />
        <StatBadge icon={Users} label="Active" value={stats.activeOwners} variant="success" />
        <StatBadge icon={PawPrint} label="Total Pets" value={stats.totalPets} variant="neutral" />
        <StatBadge icon={PawPrint} label="Active" value={stats.activePets} variant="warning" />
      </div>
    </div>

    {/* Right: Actions */}
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add Owner
      </Button>
      <Button className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add Pet
      </Button>
    </div>
  </div>
);

// Stat Badge Component - Pill style
const StatBadge = ({ icon: Icon, label, value, variant = 'neutral' }) => {
  const variants = {
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
        variants[variant]
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
};

export default UnifiedPetPeopleView;
