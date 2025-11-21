import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PawPrint, Plus, Search, Filter, Grid3x3, List, Heart, AlertTriangle, Users, Calendar, Upload, Download, FileText, Syringe, ShieldAlert, User, Phone, Mail, MapPin, Bookmark, Clock, DollarSign } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import PetAvatar from '@/components/ui/PetAvatar';
import { usePetsQuery, useCreatePetMutation } from '../api';
import { useExpiringVaccinationsQuery } from '../api-vaccinations';
import { PetFormModal } from '../components';
import EmptyStatePets from '../components/EmptyStatePets';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { PanelSection } from '@/components/layout/PanelSection';
import { PropertyList } from '@/components/ui/PropertyList';
import { EmptyState } from '@/components/ui/EmptyState';
import { ViewModeToggle } from '@/components/ui/ViewModeToggle';
import { BoardView } from '@/components/ui/BoardView';
import { SplitView } from '@/components/ui/SplitView';
import { useViewMode } from '@/hooks/useViewMode';

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
const Pets = () => {
  const navigate = useNavigate();
  const [petFormModalOpen, setPetFormModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useViewMode('pets-view-mode', 'table'); // table, board, or split
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);

  // REAL API DATA - preserved from existing implementation
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
          <PetAvatar
            pet={pet}
            size="lg"
            className="flex-shrink-0"
            showStatus={false}
          />
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
            <PetAvatar
              pet={pet}
              size="md"
              className="flex-shrink-0"
              showStatus={false}
            />
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

  // Left Panel - Filters and Navigation
  const renderLeftPanel = () => (
    <div>
      {/* Saved Views Section */}
      <PanelSection
        title="Saved Views"
        collapsible
        defaultOpen
        storageKey="pets-saved-views"
      >
        <div className="space-y-1">
          <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-surface-secondary flex items-center gap-2">
            <Bookmark className="h-4 w-4" />
            All Pets
          </button>
          <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-surface-secondary flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Active Pets
          </button>
          <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-surface-secondary flex items-center gap-2">
            <Syringe className="h-4 w-4" />
            Vaccinations Due
          </button>
          <button className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-surface-secondary flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Special Care
          </button>
        </div>
      </PanelSection>

      {/* Filters Section */}
      <PanelSection
        title="Filters"
        collapsible
        defaultOpen
        storageKey="pets-filters"
      >
        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2 block">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-[var(--border-light)] rounded-md text-sm bg-white dark:bg-[var(--surface-primary)] text-[var(--text-primary)]"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

        </div>
      </PanelSection>

      {/* Stats Section */}
      <PanelSection
        title="Statistics"
        collapsible
        defaultOpen={false}
        storageKey="pets-stats"
      >
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">Total Pets</span>
            <span className="font-semibold text-[var(--text-primary)]">{stats.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">Active</span>
            <span className="font-semibold text-[var(--text-primary)]">{stats.active}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">With Bookings</span>
            <span className="font-semibold text-[var(--text-primary)]">{stats.withBookings}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-[var(--text-secondary)]">Expiring Vaccines</span>
            <span className="font-semibold text-yellow-600">{stats.expiringVaccinations}</span>
          </div>
        </div>
      </PanelSection>
    </div>
  );

  // Right Panel - Pet Preview
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
    const bookingCount = selectedPet.bookings?.length || 0;
    const lastBooking = selectedPet.bookings?.[0];

    const properties = [
      { label: 'Name', value: selectedPet.name },
      { label: 'Species', value: selectedPet.species || 'Dog' },
      { label: 'Breed', value: selectedPet.breed || 'Unknown' },
      { label: 'Age', value: selectedPet.age ? `${selectedPet.age} years` : 'Unknown' },
      { label: 'Weight', value: selectedPet.weight ? `${selectedPet.weight} lbs` : 'Unknown' },
      { label: 'Gender', value: selectedPet.gender || 'Unknown' },
      { label: 'Color', value: selectedPet.color || 'Unknown' },
      { label: 'Status', value: <Badge variant={selectedPet.status === 'active' ? 'success' : 'neutral'}>{selectedPet.status || 'active'}</Badge> },
      { label: 'Microchip', value: selectedPet.microchip || 'Not chipped' },
      { label: 'Owner', value: primaryOwner?.name || primaryOwner?.email || 'Unknown' },
      { label: 'Owner Email', value: primaryOwner?.email || '—' },
      { label: 'Owner Phone', value: primaryOwner?.phone || '—' },
      { label: 'Total Bookings', value: bookingCount },
      { label: 'Last Booking', value: lastBooking ? new Date(lastBooking.checkIn).toLocaleDateString() : 'Never' },
      { label: 'Medical Notes', value: selectedPet.medicalNotes || '—' },
      { label: 'Dietary Notes', value: selectedPet.dietaryNotes || '—' },
      { label: 'Behavior Notes', value: selectedPet.behaviorNotes || '—' },
      { label: 'Special Needs', value: selectedPet.specialNeeds || '—' },
      { label: 'Emergency Contact', value: selectedPet.emergencyContact?.name || '—' },
      { label: 'Emergency Phone', value: selectedPet.emergencyContact?.phone || '—' },
      { label: 'Created', value: selectedPet.createdAt ? new Date(selectedPet.createdAt).toLocaleDateString() : '—' },
    ];

    return (
      <div className="h-full overflow-y-auto">
        {/* Pet Header */}
        <div className="p-6 border-b border-gray-200 dark:border-[var(--border-light)]">
          <div className="flex items-center gap-4 mb-4">
            <PetAvatar pet={selectedPet} size="lg" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">{selectedPet.name}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{selectedPet.breed || 'Unknown breed'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/pets/${selectedPet.recordId}`)}>
              <FileText className="h-4 w-4 mr-1" />
              Full Details
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Calendar className="h-4 w-4 mr-1" />
              Book
            </Button>
          </div>
        </div>

        {/* Pet Properties */}
        <PanelSection title="Basic Information" collapsible defaultOpen>
          <PropertyList properties={properties.slice(0, 9)} />
        </PanelSection>

        <PanelSection title="Owner Information" collapsible defaultOpen>
          <PropertyList properties={properties.slice(9, 12)} />
        </PanelSection>

        <PanelSection title="Booking History" collapsible defaultOpen>
          <PropertyList properties={properties.slice(12, 14)} />
        </PanelSection>

        <PanelSection title="Medical & Care Notes" collapsible defaultOpen>
          <PropertyList properties={properties.slice(14, 20)} />
        </PanelSection>

        <PanelSection title="System Information" collapsible defaultOpen={false}>
          <PropertyList properties={properties.slice(20)} />
        </PanelSection>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Clients > Pets"
        title="Pets"
        actions={
          !showEmptyState && !isLoading && (
            <>
              {/* View Mode Toggle */}
              <ViewModeToggle
                mode={viewMode}
                onChange={setViewMode}
                availableModes={['table', 'board', 'split']}
              />

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
      ) : viewMode === 'board' ? (
        /* BOARD VIEW - Kanban by Status */
        <div className="flex-1 overflow-hidden p-6">
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-text-secondary pointer-events-none" />
              <input
                type="text"
                placeholder="Search pets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-[var(--border-light)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B5DD3] focus:border-transparent text-sm bg-white dark:bg-[var(--surface-primary)] text-[var(--text-primary)]"
              />
            </div>
          </div>

          <BoardView
            columns={[
              { id: 'active', title: 'Active Pets' },
              { id: 'inactive', title: 'Inactive Pets' },
            ]}
            items={filteredPets}
            getItemStatus={(pet) => pet.status || 'active'}
            onItemClick={setSelectedPet}
            renderCard={(pet) => {
              const primaryOwner = pet.owners?.[0];
              const bookingCount = pet.bookings?.length || 0;

              return (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <PetAvatar pet={pet} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[var(--text-primary)] truncate">
                        {pet.name}
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)] truncate">
                        {pet.breed || 'Unknown breed'}
                      </p>
                    </div>
                  </div>

                  {primaryOwner && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mt-2">
                      <User className="w-3 h-3" />
                      <span className="truncate">{primaryOwner.name || primaryOwner.email}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-[var(--text-tertiary)]">{bookingCount} bookings</span>
                    {pet.medicalNotes && (
                      <Heart className="w-3 h-3 text-orange-500" title="Has medical notes" />
                    )}
                  </div>
                </div>
              );
            }}
          />
        </div>
      ) : viewMode === 'split' ? (
        /* SPLIT VIEW - List + Detail */
        <div className="flex-1 overflow-hidden">
          <SplitView
            items={filteredPets}
            selectedItem={selectedPet}
            onItemSelect={setSelectedPet}
            renderListItem={(pet) => {
              const primaryOwner = pet.owners?.[0];

              return (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <PetAvatar pet={pet} size="md" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[var(--text-primary)] truncate">
                        {pet.name}
                      </h4>
                      <p className="text-sm text-[var(--text-secondary)] truncate">
                        {pet.breed || 'Unknown breed'} • {pet.age ? `${pet.age}y` : 'Age unknown'}
                      </p>
                    </div>
                    <Badge variant={pet.status === 'active' ? 'success' : 'neutral'} className="flex-shrink-0">
                      {pet.status || 'active'}
                    </Badge>
                  </div>

                  {primaryOwner && (
                    <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1 mt-1">
                      <User className="w-3 h-3" />
                      {primaryOwner.name || primaryOwner.email}
                    </p>
                  )}
                </div>
              );
            }}
            renderDetail={(pet) => renderRightPanel()}
          />
        </div>
      ) : (
        /* TABLE VIEW - ThreePanelLayout with grid/list */
        <ThreePanelLayout
          left={renderLeftPanel()}
          showLeftPanel={true}
          showRightPanel={!!selectedPet}
          right={renderRightPanel()}
          center={
            <div className="p-6">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-text-secondary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search pets by name, breed, or owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-[var(--border-light)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B5DD3] focus:border-transparent text-sm bg-white dark:bg-[var(--surface-primary)] text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Results Count */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-[var(--text-secondary)]">
                  Showing {filteredPets.length} of {pets.length} pets
                </p>
              </div>

              {/* Pets Display - Grid View (default for table mode) */}
              {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-lg" />
                  ))}
                </div>
              ) : filteredPets.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
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
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {filteredPets.map((pet) => (
                    <PetCard key={pet.recordId} pet={pet} />
                  ))}
                </div>
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
