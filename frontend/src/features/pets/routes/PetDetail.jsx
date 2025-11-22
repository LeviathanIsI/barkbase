/**
 * Pet Detail Page - Phase 6 Implementation
 * HubSpot-style record detail with tab organization and progressive disclosure
 *
 * THREE-COLUMN LAYOUT:
 * - Left: Collapsible property sections (Basic Info, Medical, Dietary)
 * - Center: Tab navigation and content (max 5 tabs)
 * - Right: Owner info and quick actions
 *
 * ACTUAL API DATA STRUCTURES:
 *
 * pet: {
 *   recordId: string,
 *   name: string,
 *   breed: string,
 *   species: string ('Dog' | 'Cat'),
 *   gender: string,
 *   weight: number,
 *   age: string,
 *   color: string,
 *   microchipNumber: string,
 *   dietaryNotes: string,
 *   behaviorNotes: string,
 *   medicalNotes: string,
 *   specialNeeds: string,
 *   lastVetVisit: string (ISO date),
 *   nextAppointment: string (ISO date),
 *   owners: Array<{recordId, name, firstName, lastName, email, phone}>,
 *   bookings: Array<{recordId, checkIn, checkOut, status, roomNumber}>,
 *   ...
 * }
 *
 * vaccinations: Array<{
 *   recordId: string,
 *   type: string,
 *   administeredAt: string (ISO date),
 *   expiresAt: string (ISO date),
 *   ...
 * }>
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PawPrint,
  Edit,
  Trash2,
  Calendar,
  Syringe,
  User,
  ClipboardList,
  Activity,
  Heart,
  FileText,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { PanelSection } from '@/components/layout/PanelSection';
import { PropertyList } from '@/components/ui/PropertyList';
import { Timeline, TimelineItem } from '@/components/ui/Timeline';
import { StatusPill } from '@/components/primitives';
import {
  usePetQuery,
  useDeletePetMutation,
  useUpdatePetMutation,
  usePetVaccinationsQuery,
  useCreateVaccinationMutation,
  useUpdateVaccinationMutation,
  useDeleteVaccinationMutation,
} from '../api';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { PetFormModal, VaccinationFormModal } from '../components';
import { cn } from '@/lib/utils';

const PetDetail = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.tenant?.recordId ?? 'unknown');

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [vaccinationModalOpen, setVaccinationModalOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState(null);
  const [selectedVaccineType, setSelectedVaccineType] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vaccinationToDelete, setVaccinationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePetDialogOpen, setDeletePetDialogOpen] = useState(false);
  const [isDeletingPet, setIsDeletingPet] = useState(false);

  // API Queries - PRESERVE existing data fetching
  const petQuery = usePetQuery(petId);
  const { data: vaccinations = [], isLoading: vaccLoading } = usePetVaccinationsQuery(petId);
  const pet = petQuery.data;

  // Mutations
  const deletePetMutation = useDeletePetMutation();
  const updatePetMutation = useUpdatePetMutation(petId);
  const createVaccinationMutation = useCreateVaccinationMutation(petId);
  const updateVaccinationMutation = useUpdateVaccinationMutation(petId);
  const deleteVaccinationMutation = useDeleteVaccinationMutation(petId);

  // Tabs configuration - MAX 5 TABS (HubSpot pattern)
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'history', label: 'History', icon: ClipboardList },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  // Helper functions for vaccinations (preserved from original)
  const getDefaultVaccines = (species) => {
    if (species === 'Dog') {
      return ['Rabies', 'DAPP', 'DHPP', 'Bordetella', 'Influenza', 'Leptospirosis'];
    } else if (species === 'Cat') {
      return ['Rabies', 'FVRCP', 'FeLV'];
    }
    return ['Rabies', 'DAPP', 'DHPP'];
  };

  const normalizeVaccineType = (type) => {
    const normalized = type?.toLowerCase()?.trim();
    if (normalized === 'dhpp' || normalized === 'dapp/dhpp') return 'dapp';
    if (normalized === 'fvr' || normalized === 'fvr/c') return 'fvrcp';
    return normalized;
  };

  const getVaccinationStatus = (vaccination) => {
    if (!vaccination) return 'missing';
    const now = new Date();
    const expiresAt = new Date(vaccination.expiresAt);
    const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (expiresAt < now) return 'expired';
    if (daysUntilExpiry <= 30) return 'expiring';
    return 'up to date';
  };

  const getStatusDisplay = (status) => {
    if (status === 'up to date') return { label: 'Up to date', intent: 'active' };
    if (status === 'expiring') return { label: 'Due soon', intent: 'warning' };
    if (status === 'expired' || status === 'missing') return { label: 'Due', intent: 'canceled' };
    return { label: 'Due', intent: 'inactive' };
  };

  const getVaccinationForType = (type) => {
    const normalizedType = normalizeVaccineType(type);
    const matchingVaccinations = vaccinations.filter(v => normalizeVaccineType(v.type) === normalizedType);
    return matchingVaccinations.sort((a, b) => new Date(b.administeredAt) - new Date(a.administeredAt))[0];
  };

  // Vaccination handlers (preserved)
  const handleAddVaccination = (vaccineType) => {
    setSelectedVaccineType(vaccineType);
    setEditingVaccination(null);
    setVaccinationModalOpen(true);
  };

  const handleEditVaccination = (vaccination) => {
    setEditingVaccination(vaccination);
    setSelectedVaccineType('');
    setVaccinationModalOpen(true);
  };

  const handleDeleteClick = (vaccination) => {
    setVaccinationToDelete(vaccination);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vaccinationToDelete) return;
    setIsDeleting(true);
    try {
      await deleteVaccinationMutation.mutateAsync(vaccinationToDelete.recordId);
      toast.success('Vaccination deleted successfully');
      setDeleteDialogOpen(false);
      setVaccinationToDelete(null);
    } catch (error) {
      console.error('Failed to delete vaccination:', error);
      toast.error(error?.message || 'Failed to delete vaccination');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVaccinationSubmit = async (data) => {
    try {
      if (editingVaccination) {
        await updateVaccinationMutation.mutateAsync({
          vaccinationId: editingVaccination.recordId,
          payload: data
        });
        toast.success('Vaccination updated successfully');
      } else {
        await createVaccinationMutation.mutateAsync(data);
        toast.success('Vaccination added successfully');
      }
      setVaccinationModalOpen(false);
      setEditingVaccination(null);
      setSelectedVaccineType('');
    } catch (error) {
      console.error('Failed to save vaccination:', error);
      toast.error(error?.message || 'Failed to save vaccination');
    }
  };

  // Pet handlers (preserved)
  const handleEdit = () => setEditModalOpen(true);

  const handleEditSubmit = async (data) => {
    try {
      await updatePetMutation.mutateAsync(data);
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['pets', { tenantId }, petId] });
      toast.success('Pet updated successfully');
    } catch (error) {
      console.error('Failed to update pet:', error);
    }
  };

  const handleDelete = () => setDeletePetDialogOpen(true);

  const handleConfirmPetDelete = async () => {
    setIsDeletingPet(true);
    try {
      await deletePetMutation.mutateAsync(petId);
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantId) });
      toast.success('Pet deleted successfully');
      navigate('/pets');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete pet');
    } finally {
      setIsDeletingPet(false);
      setDeletePetDialogOpen(false);
    }
  };

  // Helper functions
  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString();
  };

  const calculateDays = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate - startDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getActivityIcon = (type) => {
    const icons = {
      'booking': Calendar,
      'vaccination': Syringe,
      'note': FileText,
      'visit': MapPin,
    };
    return icons[type] || Activity;
  };

  // Loading state
  if (petQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-[var(--text-secondary)]">
          Loading pet details...
        </div>
      </div>
    );
  }

  // Not found state
  if (!pet) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--text-secondary)]">Pet not found</p>
      </div>
    );
  }

  // Get primary owner
  const primaryOwner = pet.owners?.[0];
  const currentBooking = pet.currentBooking || pet.bookings?.find(b => b.status === 'CHECKED_IN');

  return (
    <>
      <ThreePanelLayout
        leftWidth="w-80"
        rightWidth="w-80"
        showLeftPanel={true}
        showRightPanel={!!primaryOwner}

        // LEFT PANEL: Collapsible Property Sections
        left={
          <>
            {/* Basic Information */}
            <PanelSection
              title="Basic Information"
              collapsible
              defaultOpen
              storageKey="pet-basic-info"
            >
              <PropertyList
                properties={[
                  { label: 'Name', value: pet.name },
                  { label: 'Breed', value: pet.breed || '—' },
                  { label: 'Species', value: pet.species || '—' },
                  { label: 'Gender', value: pet.gender || '—' },
                  { label: 'Age', value: pet.age || '—' },
                  { label: 'Weight', value: pet.weight ? `${pet.weight} lbs` : '—' },
                  { label: 'Color', value: pet.color || '—' },
                  { label: 'Microchip', value: pet.microchipNumber || '—' },
                ]}
              />
            </PanelSection>

            {/* Current Stay */}
            {currentBooking && (
              <PanelSection
                title="Current Stay"
                collapsible
                defaultOpen
                storageKey="pet-current-stay"
              >
                <PropertyList
                  properties={[
                    {
                      label: 'Status',
                      render: <Badge variant="success">Checked In</Badge>
                    },
                    { label: 'Room', value: currentBooking.roomNumber || '—' },
                    { label: 'Check-In', value: formatDate(currentBooking.checkIn) },
                    { label: 'Check-Out', value: formatDate(currentBooking.checkOut) },
                    {
                      label: 'Duration',
                      value: `${calculateDays(currentBooking.checkIn, currentBooking.checkOut)} days`
                    },
                  ]}
                />
              </PanelSection>
            )}

            {/* Medical Information */}
            <PanelSection
              title="Medical Information"
              collapsible
              defaultOpen={false}
              storageKey="pet-medical-info"
            >
              <PropertyList
                properties={[
                  { label: 'Medical Notes', value: pet.medicalNotes || 'None reported' },
                  { label: 'Special Needs', value: pet.specialNeeds || 'None' },
                  { label: 'Last Vet Visit', value: formatDate(pet.lastVetVisit) },
                  { label: 'Next Appointment', value: formatDate(pet.nextAppointment) },
                ]}
              />
            </PanelSection>

            {/* Dietary Information */}
            <PanelSection
              title="Dietary Information"
              collapsible
              defaultOpen={false}
              storageKey="pet-dietary-info"
            >
              <PropertyList
                properties={[
                  { label: 'Dietary Notes', value: pet.dietaryNotes || 'Not provided' },
                  { label: 'Special Diet', value: pet.specialDiet || 'None' },
                ]}
              />
            </PanelSection>

            {/* Behavior Information */}
            {pet.behaviorNotes && (
              <PanelSection
                title="Behavior Notes"
                collapsible
                defaultOpen={false}
                storageKey="pet-behavior-info"
              >
                <p className="text-sm text-[var(--text-primary)]">
                  {pet.behaviorNotes}
                </p>
              </PanelSection>
            )}
          </>
        }

        // CENTER PANEL: Tab Navigation and Content
        center={
          <div className="h-full flex flex-col">
            {/* Page Header */}
            <div className="p-6 border-b border-gray-200 dark:border-[var(--border-light)]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  {/* Pet Avatar */}
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <PawPrint className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>

                  {/* Pet Name & Details */}
                  <div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-1">
                      {pet.name}
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {pet.breed && `${pet.breed} • `}
                      {pet.gender && `${pet.gender} • `}
                      {pet.age || 'Age unknown'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Tab Navigation */}
              <nav className="flex space-x-8 border-b border-gray-200 dark:border-[var(--border-light)] -mb-px">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors",
                        activeTab === tab.id
                          ? "border-primary-600 text-primary-600"
                          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-gray-300 dark:hover:border-[var(--border)]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && <OverviewTab pet={pet} />}
              {activeTab === 'history' && <HistoryTab pet={pet} />}
              {activeTab === 'health' && (
                <HealthTab
                  pet={pet}
                  vaccinations={vaccinations}
                  vaccLoading={vaccLoading}
                  getDefaultVaccines={getDefaultVaccines}
                  getVaccinationForType={getVaccinationForType}
                  getVaccinationStatus={getVaccinationStatus}
                  getStatusDisplay={getStatusDisplay}
                  handleAddVaccination={handleAddVaccination}
                  handleEditVaccination={handleEditVaccination}
                  handleDeleteClick={handleDeleteClick}
                />
              )}
              {activeTab === 'bookings' && <BookingsTab pet={pet} />}
              {activeTab === 'documents' && <DocumentsTab pet={pet} />}
            </div>
          </div>
        }

        // RIGHT PANEL: Owner & Quick Actions
        right={
          <>
            {/* Owner Info */}
            {primaryOwner && (
              <PanelSection title="Owner">
                <div className="space-y-4">
                  {/* Owner Avatar & Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {primaryOwner.name || `${primaryOwner.firstName || ''} ${primaryOwner.lastName || ''}`.trim()}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {primaryOwner.email}
                      </p>
                    </div>
                  </div>

                  {/* Owner Contact Details */}
                  {primaryOwner.phone && (
                    <PropertyList
                      properties={[
                        { label: 'Phone', value: primaryOwner.phone },
                        { label: 'Email', value: primaryOwner.email },
                      ]}
                    />
                  )}

                  {/* View Full Owner Profile */}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/owners/${primaryOwner.recordId}`)}
                  >
                    View Owner Profile
                  </Button>
                </div>
              </PanelSection>
            )}

            {/* Quick Actions */}
            <PanelSection title="Quick Actions">
              <div className="space-y-2">
                {primaryOwner?.phone && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => window.open(`tel:${primaryOwner.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Owner
                  </Button>
                )}

                {primaryOwner?.email && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => window.open(`mailto:${primaryOwner.email}`)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Owner
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => toast.info('Booking feature coming soon')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Stay
                </Button>

                {currentBooking && (
                  <Button
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() => toast.info('Check out feature coming soon')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Check Out
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => toast.info('Logging visits coming soon')}
                >
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Log Visit
                </Button>
              </div>
            </PanelSection>

            {/* Other Owners (if multiple) */}
            {pet.owners && pet.owners.length > 1 && (
              <PanelSection
                title="Other Owners"
                collapsible
                defaultOpen={false}
                storageKey="pet-other-owners"
              >
                <div className="space-y-2">
                  {pet.owners.slice(1).map(owner => (
                    <button
                      key={owner.recordId}
                      onClick={() => navigate(`/owners/${owner.recordId}`)}
                      className="w-full p-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-[var(--bg-secondary)] transition-colors border border-gray-200 dark:border-[var(--border-light)]"
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim()}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {owner.email}
                      </p>
                    </button>
                  ))}
                </div>
              </PanelSection>
            )}
          </>
        }
      />

      {/* Modals (preserved) */}
      <PetFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        pet={pet}
        onSubmit={handleEditSubmit}
        isLoading={updatePetMutation.isPending}
      />

      <VaccinationFormModal
        open={vaccinationModalOpen}
        onClose={() => {
          setVaccinationModalOpen(false);
          setEditingVaccination(null);
          setSelectedVaccineType('');
        }}
        vaccination={editingVaccination}
        petSpecies={pet?.species}
        selectedVaccineType={selectedVaccineType}
        onSubmit={handleVaccinationSubmit}
        isLoading={createVaccinationMutation.isPending || updateVaccinationMutation.isPending}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setVaccinationToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Vaccination"
        message={`Are you sure you want to delete the ${vaccinationToDelete?.type} vaccination? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={deletePetDialogOpen}
        onClose={() => setDeletePetDialogOpen(false)}
        onConfirm={handleConfirmPetDelete}
        title="Delete Pet"
        message={`Are you sure you want to delete ${pet?.name}? This will permanently remove all associated records including vaccinations and bookings. This action cannot be undone.`}
        confirmText="Delete Pet"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingPet}
      />
    </>
  );
};

// TAB COMPONENTS

function OverviewTab({ pet }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          About {pet.name}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {pet.notes || pet.behaviorNotes || `${pet.name} is a ${pet.age || 'young'} ${pet.breed || pet.species}.`}
        </p>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBox
          label="Total Stays"
          value={pet.bookings?.length || 0}
          icon={Calendar}
        />
        <StatBox
          label="Last Visit"
          value={pet.lastVetVisit ? formatDate(pet.lastVetVisit) : 'Never'}
          icon={MapPin}
        />
        <StatBox
          label="Next Booking"
          value={pet.nextAppointment ? formatDate(pet.nextAppointment) : 'None'}
          icon={Calendar}
        />
      </div>
    </div>
  );
}

function HistoryTab({ pet }) {
  // Convert bookings to timeline items
  const timelineItems = (pet.bookings || [])
    .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))
    .map(booking => ({
      id: booking.recordId,
      type: 'booking',
      title: `Booking #${booking.recordId?.slice(0, 8) || booking.id?.slice(0, 8)}`,
      description: `${formatDate(booking.checkIn)} - ${formatDate(booking.checkOut)}`,
      timestamp: booking.checkIn,
      status: booking.status,
    }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Activity Timeline
        </h2>

        <Timeline
          items={timelineItems}
          emptyMessage="No activity recorded yet"
          renderItem={(activity) => (
            <TimelineItem
              icon={getActivityIcon(activity.type)}
              title={activity.title}
              description={activity.description}
              timestamp={activity.timestamp}
              metadata={
                activity.status && (
                  <StatusPill status={activity.status} />
                )
              }
            />
          )}
        />
      </div>
    </div>
  );
}

function HealthTab({
  pet,
  vaccinations,
  vaccLoading,
  getDefaultVaccines,
  getVaccinationForType,
  getVaccinationStatus,
  getStatusDisplay,
  handleAddVaccination,
  handleEditVaccination,
  handleDeleteClick,
}) {
  const defaultVaccines = getDefaultVaccines(pet.species);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Vaccinations
        </h2>

        {vaccLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading vaccinations…</p>
        ) : (
          <>
            {/* Vaccination Cards */}
            <div className="space-y-3 mb-6">
              {defaultVaccines.map((vaccineType) => {
                const vaccination = getVaccinationForType(vaccineType);
                const status = getVaccinationStatus(vaccination);
                const { label, intent } = getStatusDisplay(status);

                return (
                  <div
                    key={vaccineType}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-[var(--border-light)] rounded-lg hover:border-primary-600 dark:hover:border-primary-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                        <Syringe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{vaccineType}</p>
                        {vaccination ? (
                          <p className="text-sm text-[var(--text-secondary)]">
                            Expires {formatDate(vaccination.expiresAt)}
                          </p>
                        ) : (
                          <p className="text-sm text-[var(--text-secondary)]">Not recorded</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill intent={intent}>{label}</StatusPill>
                      {vaccination ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditVaccination(vaccination)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(vaccination)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddVaccination(vaccineType)}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Custom Vaccine */}
            <Button
              variant="outline"
              onClick={() => handleAddVaccination('')}
              className="w-full"
            >
              + Add Custom Vaccine
            </Button>
          </>
        )}
      </div>

      {/* Medical Notes */}
      {pet.medicalNotes && (
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">
            Medical Notes
          </h3>
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-[var(--text-primary)]">
              {pet.medicalNotes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingsTab({ pet }) {
  const allBookings = pet?.bookings || [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Booking History
        </h2>
        <span className="text-sm text-[var(--text-secondary)]">
          {allBookings.length} {allBookings.length === 1 ? 'booking' : 'bookings'}
        </span>
      </div>

      {allBookings.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] text-center py-8">
          No bookings yet
        </p>
      ) : (
        <div className="space-y-3">
          {allBookings.map((booking) => (
            <div
              key={booking.recordId}
              className="p-4 rounded-lg border border-gray-200 dark:border-[var(--border-light)] hover:border-primary-600 dark:hover:border-primary-600 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-[var(--text-primary)]">
                  {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                </h4>
                <StatusPill status={booking.status} />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {booking.roomNumber && `Room ${booking.roomNumber} • `}
                {calculateDays(booking.checkIn, booking.checkOut)} days
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ pet }) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Documents
        </h2>
        <Button size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <p className="text-sm text-[var(--text-secondary)] text-center py-8">
        No documents uploaded yet
      </p>
    </div>
  );
}

// Helper Components

function StatBox({ label, value, icon: Icon }) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-[var(--border-light)]">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className="text-xl font-semibold text-[var(--text-primary)]">
        {value}
      </p>
    </div>
  );
}

// Helper Functions

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString();
}

function calculateDays(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate - startDate;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getActivityIcon(type) {
  const icons = {
    'booking': Calendar,
    'vaccination': Syringe,
    'note': FileText,
    'visit': MapPin,
  };
  return icons[type] || Activity;
}

export default PetDetail;
