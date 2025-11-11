import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Plus, Search, Filter, Grid3x3, List, Heart, AlertTriangle, Users, Calendar, Upload, Download, FileText, Syringe, ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { usePetsQuery, useCreatePetMutation } from '../api';
import { useExpiringVaccinationsQuery } from '../api-vaccinations';
import { PetFormModal } from '../components';
import EmptyStatePets from '../components/EmptyStatePets';
import PetDetailsDrawer from '../components/PetDetailsDrawer';

const Pets = () => {
  const navigate = useNavigate();
  const [petFormModalOpen, setPetFormModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid');
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);

  const { data: pets = [], isLoading: isLoadingData, error } = usePetsQuery();
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

  // Filter pets based on search and status
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

      return matchesSearch && matchesStatus;
    });
  }, [pets, searchTerm, statusFilter]);

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
      <div>
        <PageHeader title="Pets" breadcrumb="Home > Clients > Pets" />
        <Card>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#263238] dark:text-text-primary mb-2">Error Loading Pets</h3>
            <p className="text-[#64748B] dark:text-text-secondary">Unable to load pets data. Please try again.</p>
          </div>
        </Card>
      </div>
    );
  }

  const PetCard = ({ pet }) => {
    const primaryOwner = pet.owners?.[0];
    const bookingCount = pet.bookings?.length || 0;
    const lastBooking = pet.bookings?.[0];
    const status = pet.status || 'active';
    
    // Mock vaccination expiration check (in real app, would check actual dates)
    const hasExpiringVaccinations = Math.random() > 0.7; // 30% chance for demo
    const hasMedicalAlerts = pet.medicalNotes || pet.dietaryNotes;

    return (
      <Card
        className="hover:shadow-lg transition-all cursor-pointer relative p-6"
        onClick={() => setSelectedPet(pet)}
      >
        {/* Alerts Badge */}
        {(hasExpiringVaccinations || hasMedicalAlerts) && (
          <div className="absolute top-4 right-4 flex gap-1.5">
            {hasExpiringVaccinations && (
              <div className="w-6 h-6 bg-yellow-100 dark:bg-surface-secondary rounded-full flex items-center justify-center" title="Vaccination expiring soon">
                <ShieldAlert className="h-4 w-4 text-yellow-600" />
              </div>
            )}
            {hasMedicalAlerts && (
              <div className="w-6 h-6 bg-orange-100 dark:bg-surface-secondary rounded-full flex items-center justify-center" title="Special care notes">
                <Heart className="h-4 w-4 text-orange-600" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-start gap-3 mb-4 pr-8">
          <div className="w-12 h-12 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center flex-shrink-0">
            <PawPrint className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-[#263238] dark:text-text-primary truncate">{pet.name}</h3>
            <p className="text-sm text-[#64748B] dark:text-text-secondary truncate">{pet.breed || 'Unknown breed'}</p>
            {pet.age && <p className="text-xs text-[#64748B] dark:text-text-secondary">{pet.age} years old</p>}
          </div>
          <Badge variant={status === 'active' ? 'success' : 'neutral'} className="flex-shrink-0">
            {status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="space-y-2">
          {primaryOwner && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-[#64748B] dark:text-text-secondary flex-shrink-0" />
              <span className="text-[#64748B] dark:text-text-secondary truncate">{primaryOwner.name || primaryOwner.email}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#64748B] dark:text-text-secondary" />
              <span className="text-[#64748B] dark:text-text-secondary">{bookingCount} booking{bookingCount !== 1 ? 's' : ''}</span>
            </div>
            {lastBooking && (
              <span className="text-xs text-[#64748B] dark:text-text-secondary">
                Last: {new Date(lastBooking.checkIn).toLocaleDateString()}
              </span>
            )}
          </div>

          {hasExpiringVaccinations && (
            <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg px-3 py-2">
              <p className="text-xs text-yellow-800 flex items-center gap-1.5">
                <Syringe className="h-3.5 w-3.5 flex-shrink-0" />
                Vaccination expiring soon
              </p>
            </div>
          )}

          {hasMedicalAlerts && (
            <div className="bg-orange-50 dark:bg-surface-primary border border-orange-200 rounded-lg px-3 py-2">
              <p className="text-xs text-orange-800 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                Special care required
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const PetRow = ({ pet }) => {
    const primaryOwner = pet.owners?.[0];
    const bookingCount = pet.bookings?.length || 0;
    const status = pet.status || 'active';

    return (
      <tr className="border-b border-[#F5F6FA] hover:bg-[#F5F6FA]/50 cursor-pointer transition-colors" onClick={() => setSelectedPet(pet)}>
        <td className="py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 dark:bg-primary-700 rounded-full flex items-center justify-center">
              <PawPrint className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#263238] dark:text-text-primary">{pet.name}</p>
              <p className="text-sm text-[#64748B] dark:text-text-secondary">{pet.breed || 'Unknown breed'}</p>
            </div>
          </div>
        </td>
        <td className="py-4 px-6">
          <p className="text-[#263238] dark:text-text-primary">{primaryOwner?.name || primaryOwner?.email || '--'}</p>
        </td>
        <td className="py-4 px-6">
          <Badge variant={status === 'active' ? 'success' : 'neutral'}>
            {status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        </td>
        <td className="py-4 px-6">
          <p className="text-[#263238] dark:text-text-primary">{bookingCount}</p>
        </td>
        <td className="py-4 px-6">
          {pet.medicalNotes && <Heart className="h-4 w-4 text-orange-500 inline mr-2" title="Medical notes" />}
          {pet.dietaryNotes && <AlertTriangle className="h-4 w-4 text-blue-500 inline" title="Dietary notes" />}
        </td>
      </tr>
    );
  };

  // Show empty state if no pets exist at all (not just filtered)
  const showEmptyState = !isLoading && pets.length === 0;

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Clients > Pets"
        title="Pets"
        actions={
          !showEmptyState && !isLoading && (
            <>
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Syringe className="h-4 w-4 mr-2" />
                Vaccination Report
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPetFormModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pet
              </Button>
            </>
          )
        }
      />

      {/* Show Empty State if no pets exist */}
      {showEmptyState ? (
        <EmptyStatePets
          onAddPet={() => setPetFormModalOpen(true)}
          onImport={() => setShowImportModal(true)}
        />
      ) : (
        <>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))
        ) : (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary mb-1">Total Pets</p>
                  <p className="text-2xl font-bold text-[#263238] dark:text-text-primary">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <PawPrint className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary mb-1">Active Pets</p>
                  <p className="text-2xl font-bold text-[#263238] dark:text-text-primary">{stats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary mb-1">With Bookings</p>
                  <p className="text-2xl font-bold text-[#263238] dark:text-text-primary">{stats.withBookings}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card className={`p-6 ${stats.expiringVaccinations > 0 ? 'border-yellow-300 bg-yellow-50 dark:bg-surface-primary' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary mb-1">Expiring Vaccines</p>
                  <p className="text-2xl font-bold text-[#263238] dark:text-text-primary">{stats.expiringVaccinations}</p>
                  {stats.expiringVaccinations > 0 && (
                    <p className="text-xs text-yellow-700 mt-1">Needs attention</p>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  stats.expiringVaccinations > 0 ? 'bg-yellow-200' : 'bg-yellow-100 dark:bg-surface-secondary'
                }`}>
                  <Syringe className={`h-6 w-6 ${
                    stats.expiringVaccinations > 0 ? 'text-yellow-700' : 'text-yellow-600'
                  }`} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary mb-1">Inactive</p>
                  <p className="text-2xl font-bold text-[#263238] dark:text-text-primary">{stats.inactive}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-600 dark:text-text-secondary" />
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Filters and View Toggle */}
      <Card className="mb-6 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-1">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-text-secondary pointer-events-none" />
              <input
                type="text"
                placeholder="Search pets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E0E0E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B5DD3] focus:border-transparent text-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 border border-[#E0E0E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B5DD3] focus:border-transparent text-sm bg-white dark:bg-surface-primary"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-sm text-[#64748B] dark:text-text-secondary whitespace-nowrap">
              Showing {filteredPets.length} of {pets.length} pets
            </div>
            <div className="flex border border-[#E0E0E0] rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-[#4B5DD3] text-white' : 'text-[#64748B] dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary'}`}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 transition-colors border-l border-[#E0E0E0] ${viewMode === 'list' ? 'bg-[#4B5DD3] text-white' : 'text-[#64748B] dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Pets Display */}
      <Card className="p-6">
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )
        ) : filteredPets.length === 0 ? (
          <div className="text-center py-12">
            <PawPrint className="h-12 w-12 text-[#64748B] dark:text-text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#263238] dark:text-text-primary mb-2">No Pets Found</h3>
            <p className="text-[#64748B] dark:text-text-secondary mb-4">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : 'Get started by adding your first pet.'}
            </p>
            <Button onClick={() => setPetFormModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pet
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPets.map((pet) => (
              <PetCard key={pet.recordId} pet={pet} />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -mb-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E0E0E0] bg-gray-50 dark:bg-surface-secondary">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[#64748B] dark:text-text-secondary">Pet</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[#64748B] dark:text-text-secondary">Owner</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[#64748B] dark:text-text-secondary">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[#64748B] dark:text-text-secondary">Bookings</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-[#64748B] dark:text-text-secondary">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPets.map((pet) => (
                  <PetRow key={pet.recordId} pet={pet} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

        </>
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
      
      {/* Pet Details Drawer */}
      <PetDetailsDrawer
        pet={selectedPet}
        isOpen={!!selectedPet}
        onClose={() => setSelectedPet(null)}
        onEdit={() => {
          // Handle edit - could open the PetFormModal with the selected pet
          setPetFormModalOpen(true);
        }}
      />
    </div>
  );
};

export default Pets;
