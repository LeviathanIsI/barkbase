import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Users, PawPrint } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/apiClient';
import DirectoryListHeader from '@/features/directory/components/DirectoryListHeader';
import DirectoryEmptyState from '@/features/directory/components/DirectoryEmptyState';
import DirectoryErrorState from '@/features/directory/components/DirectoryErrorState';
import { DirectoryTableSkeleton } from '@/features/directory/components/DirectorySkeleton';
import UnifiedOwnerCard from '@/features/directory/components/UnifiedOwnerCard';
import { cn } from '@/lib/cn';

/**
 * UnifiedPetPeopleView Component
 * Shows owner details with all pets in a single unified view
 * Addresses research finding: "pet/client info separated from operational context"
 */
// TODO (C1:4 - Directory Query Consolidation): Replace ad-hoc owners+pets fetching with shared directory snapshot hook.
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

  const headerActions = (
    <>
      <Button key="add-owner" variant="outline">
        <Plus className="mr-1 h-4 w-4" />
        Add Owner
      </Button>
      <Button key="add-pet">
        <Plus className="mr-1 h-4 w-4" />
        Add Pet
      </Button>
    </>
  );

  if (error) {
    return (
      <div className="space-y-6">
        <DirectoryListHeader
          title="Pets & People"
          breadcrumb="Home > Pets & People"
          actions={headerActions}
        />
        <DirectoryErrorState message="Unable to load pets & people data. Please try again." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DirectoryListHeader
        title="Pets & People"
        breadcrumb="Home > Pets & People"
        actions={headerActions}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Total Owners" value={stats.totalOwners} color="text-blue-600" />
          <StatCard icon={Users} label="Active Owners" value={stats.activeOwners} color="text-green-600" />
          <StatCard icon={PawPrint} label="Total Pets" value={stats.totalPets} color="text-purple-600" />
          <StatCard icon={PawPrint} label="Active Pets" value={stats.activePets} color="text-orange-600" />
        </div>

        <Card className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <input
                type="text"
                placeholder="Search by owner name, email, phone, or pet name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-surface-border"
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 sm:flex-row lg:flex-none lg:gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-surface-border sm:w-auto"
              >
                <option value="all">All Clients</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="flex items-center gap-2">
                <Button
                  key="view-grid"
                  variant={viewMode === 'grid' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  key="view-list"
                  variant={viewMode === 'list' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </DirectoryListHeader>

      {isLoading ? (
        <DirectoryTableSkeleton />
      ) : filteredOwners.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid gap-6 lg:grid-cols-2' : 'space-y-4'}>
          {filteredOwners.map((owner, index) => (
            <UnifiedOwnerCard key={owner.id || owner.recordId || index} owner={owner} getVaccinationStatus={getVaccinationStatus} />
          ))}
        </div>
      ) : (
        <DirectoryEmptyState
          title="No clients found"
          description={
            searchTerm ? `No results for "${searchTerm}"` : 'Start by adding your first client.'
          }
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

const StatCard = ({ icon: Icon, label, value, color }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <Icon className={cn('h-8 w-8 opacity-20', color)} />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-gray-600 dark:text-text-secondary">{label}</p>
      </div>
    </div>
  </Card>
);

export default UnifiedPetPeopleView;
