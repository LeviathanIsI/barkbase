/**
 * Pet Detail Page - Phase 7 Enterprise Layout
 * Two-column layout with strong detail header, clear content zones,
 * and token-based styling consistent with the enterprise design system.
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
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/Card';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { PropertyList } from '@/components/ui/PropertyList';
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

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
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

  // Loading state
  if (petQuery.isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        <div className="animate-pulse">Loading pet details...</div>
      </div>
    );
  }

  // Not found state
  if (!pet) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        <p>Pet not found</p>
      </div>
    );
  }

  // Get primary owner
  const primaryOwner = pet.owners?.[0];
  const currentBooking = pet.currentBooking || pet.bookings?.find(b => b.status === 'CHECKED_IN');
  const petDescription = [pet.breed, pet.species, pet.gender].filter(Boolean).join(' • ');

  return (
    <>
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        {/* Page Header with strong identity */}
        <PageHeader
          breadcrumbs={[
            { label: 'Directory', href: '/pets' },
            { label: 'Pets', href: '/pets' },
            { label: pet.name }
          ]}
          title={pet.name}
          description={petDescription || 'Pet details'}
          actions={
            <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
              <Button variant="outline" size="md" onClick={() => navigate('/bookings?action=new')}>
                <Plus className="h-4 w-4 mr-[var(--bb-space-2,0.5rem)]" />
                New Booking
              </Button>
              <Button variant="secondary" size="md" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-[var(--bb-space-2,0.5rem)]" />
                Edit
              </Button>
              <Button variant="ghost" size="md" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          }
        />

        {/* Two-column layout */}
        <div className="grid gap-[var(--bb-space-6,1.5rem)] lg:grid-cols-12">
          {/* Left column: Main profile & core info */}
          <div className="lg:col-span-8 space-y-[var(--bb-space-6,1.5rem)]">
            {/* Pet Profile Card */}
            <Card className="p-[var(--bb-space-6,1.5rem)]">
              <div className="flex items-start gap-[var(--bb-space-4,1rem)]">
                <div
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'var(--bb-color-accent-soft)',
                    color: 'var(--bb-color-accent)',
                  }}
                >
                  <PawPrint className="h-8 w-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)]"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    {pet.name}
                  </h2>
                  <p
                    className="text-[var(--bb-font-size-sm,0.875rem)] mt-[var(--bb-space-1,0.25rem)]"
                    style={{ color: 'var(--bb-color-text-muted)' }}
                  >
                    {petDescription || 'No details available'}
                  </p>
                  <div className="flex items-center gap-[var(--bb-space-2,0.5rem)] mt-[var(--bb-space-2,0.5rem)]">
                    <Badge variant={currentBooking ? 'success' : 'neutral'}>
                      {currentBooking ? 'In Facility' : 'Not Checked In'}
                    </Badge>
                    {pet.age && (
                      <span
                        className="text-[var(--bb-font-size-sm,0.875rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        {pet.age}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Info Grid */}
              <div className="mt-[var(--bb-space-6,1.5rem)] grid gap-[var(--bb-space-4,1rem)] sm:grid-cols-2 lg:grid-cols-4">
                <InfoItem label="Breed" value={pet.breed || '—'} />
                <InfoItem label="Species" value={pet.species || '—'} />
                <InfoItem label="Gender" value={pet.gender || '—'} />
                <InfoItem label="Weight" value={pet.weight ? `${pet.weight} lbs` : '—'} />
                <InfoItem label="Color" value={pet.color || '—'} />
                <InfoItem label="Microchip" value={pet.microchipNumber || '—'} />
                <InfoItem label="Last Vet Visit" value={formatDate(pet.lastVetVisit)} />
                <InfoItem label="Next Appointment" value={formatDate(pet.nextAppointment)} />
              </div>
            </Card>

            {/* Tab Navigation */}
            <Card className="p-0">
              <nav
                className="flex border-b px-[var(--bb-space-4,1rem)]"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-[var(--bb-space-2,0.5rem)] px-[var(--bb-space-4,1rem)] py-[var(--bb-space-3,0.75rem)] border-b-2 text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] transition-colors -mb-px",
                        activeTab === tab.id
                          ? "border-[color:var(--bb-color-accent)] text-[color:var(--bb-color-accent)]"
                          : "border-transparent text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)] hover:border-[color:var(--bb-color-border-strong)]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Tab Content */}
              <div className="p-[var(--bb-space-6,1.5rem)]">
                {activeTab === 'overview' && <OverviewTab pet={pet} formatDate={formatDate} />}
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
                    formatDate={formatDate}
                  />
                )}
                {activeTab === 'bookings' && <BookingsTab pet={pet} formatDate={formatDate} calculateDays={calculateDays} />}
                {activeTab === 'documents' && <DocumentsTab pet={pet} />}
              </div>
            </Card>
          </div>

          {/* Right column: Status + quick actions + secondary info */}
          <div className="lg:col-span-4 space-y-[var(--bb-space-6,1.5rem)]">
            {/* Status Card */}
            {currentBooking && (
              <Card className="p-[var(--bb-space-6,1.5rem)]">
                <h3
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-4,1rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  Current Stay
                </h3>
                <div className="space-y-[var(--bb-space-3,0.75rem)]">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--bb-color-text-muted)' }}>Status</span>
                    <Badge variant="success">Checked In</Badge>
                  </div>
                  <InfoItem label="Room" value={currentBooking.roomNumber || '—'} inline />
                  <InfoItem label="Check-In" value={formatDate(currentBooking.checkIn)} inline />
                  <InfoItem label="Check-Out" value={formatDate(currentBooking.checkOut)} inline />
                  <InfoItem
                    label="Duration"
                    value={`${calculateDays(currentBooking.checkIn, currentBooking.checkOut)} days`}
                    inline
                  />
                </div>
              </Card>
            )}

            {/* Owner Card */}
            {primaryOwner && (
              <Card className="p-[var(--bb-space-6,1.5rem)]">
                <h3
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-4,1rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  Owner
                </h3>
                <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: 'var(--bb-color-purple-soft)',
                      color: 'var(--bb-color-purple)',
                    }}
                  >
                    <User className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                      style={{ color: 'var(--bb-color-text-primary)' }}
                    >
                      {primaryOwner.name || `${primaryOwner.firstName || ''} ${primaryOwner.lastName || ''}`.trim()}
                    </p>
                    {primaryOwner.email && (
                      <p
                        className="truncate text-[var(--bb-font-size-xs,0.75rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        {primaryOwner.email}
                      </p>
                    )}
                  </div>
                </div>

                {(primaryOwner.phone || primaryOwner.email) && (
                  <div className="mt-[var(--bb-space-4,1rem)] space-y-[var(--bb-space-2,0.5rem)]">
                    {primaryOwner.phone && (
                      <div
                        className="flex items-center gap-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        <Phone className="h-4 w-4" />
                        {primaryOwner.phone}
                      </div>
                    )}
                    {primaryOwner.email && (
                      <div
                        className="flex items-center gap-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        <Mail className="h-4 w-4" />
                        {primaryOwner.email}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-[var(--bb-space-4,1rem)]"
                  onClick={() => navigate(`/owners/${primaryOwner.recordId}`)}
                >
                  View Owner Profile
                </Button>
              </Card>
            )}

            {/* Quick Actions Card */}
            <Card className="p-[var(--bb-space-6,1.5rem)]">
              <h3
                className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-4,1rem)]"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                Quick Actions
              </h3>
              <div className="space-y-[var(--bb-space-2,0.5rem)]">
                {primaryOwner?.phone && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(`tel:${primaryOwner.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
                    Call Owner
                  </Button>
                )}

                {primaryOwner?.email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(`mailto:${primaryOwner.email}`)}
                  >
                    <Mail className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
                    Email Owner
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/bookings?action=new')}
                >
                  <Calendar className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
                  Book Stay
                </Button>

                {currentBooking && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => toast.info('Check out feature coming soon')}
                  >
                    <CheckCircle className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
                    Check Out
                  </Button>
                )}
              </div>
            </Card>

            {/* Notes Card */}
            {(pet.medicalNotes || pet.behaviorNotes || pet.dietaryNotes) && (
              <Card className="p-[var(--bb-space-6,1.5rem)]">
                <h3
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-4,1rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  Notes
                </h3>
                <div className="space-y-[var(--bb-space-4,1rem)]">
                  {pet.medicalNotes && (
                    <NoteItem label="Medical" value={pet.medicalNotes} variant="warning" />
                  )}
                  {pet.behaviorNotes && (
                    <NoteItem label="Behavior" value={pet.behaviorNotes} variant="info" />
                  )}
                  {pet.dietaryNotes && (
                    <NoteItem label="Dietary" value={pet.dietaryNotes} variant="neutral" />
                  )}
                </div>
              </Card>
            )}

            {/* Other Owners (if multiple) */}
            {pet.owners && pet.owners.length > 1 && (
              <Card className="p-[var(--bb-space-6,1.5rem)]">
                <h3
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-4,1rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  Other Owners
                </h3>
                <div className="space-y-[var(--bb-space-2,0.5rem)]">
                  {pet.owners.slice(1).map(owner => (
                    <button
                      key={owner.recordId}
                      onClick={() => navigate(`/owners/${owner.recordId}`)}
                      className="w-full p-[var(--bb-space-3,0.75rem)] rounded-lg text-left transition-colors border"
                      style={{
                        borderColor: 'var(--bb-color-border-subtle)',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <p
                        className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                        style={{ color: 'var(--bb-color-text-primary)' }}
                      >
                        {owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim()}
                      </p>
                      <p
                        className="text-[var(--bb-font-size-xs,0.75rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        {owner.email}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
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

// Helper Components

function InfoItem({ label, value, inline = false }) {
  if (inline) {
    return (
      <div className="flex items-center justify-between">
        <span
          className="text-[var(--bb-font-size-sm,0.875rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {label}
        </span>
        <span
          className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {value}
        </span>
      </div>
    );
  }

  return (
    <div>
      <p
        className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide mb-[var(--bb-space-1,0.25rem)]"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        {label}
      </p>
      <p
        className="text-[var(--bb-font-size-sm,0.875rem)]"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}

function NoteItem({ label, value, variant = 'neutral' }) {
  const bgColors = {
    warning: 'var(--bb-color-status-negative-soft)',
    info: 'var(--bb-color-info-soft)',
    neutral: 'var(--bb-color-bg-elevated)',
  };

  return (
    <div
      className="p-[var(--bb-space-3,0.75rem)] rounded-lg"
      style={{ backgroundColor: bgColors[variant] }}
    >
      <p
        className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-1,0.25rem)]"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        {label}
      </p>
      <p
        className="text-[var(--bb-font-size-sm,0.875rem)]"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }) {
  return (
    <div
      className="p-[var(--bb-space-4,1rem)] rounded-lg border"
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-[var(--bb-space-3,0.75rem)] mb-[var(--bb-space-2,0.5rem)]">
        <Icon className="w-5 h-5" style={{ color: 'var(--bb-color-text-muted)' }} />
        <p
          className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {label}
        </p>
      </div>
      <p
        className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)]"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}

// TAB COMPONENTS

function OverviewTab({ pet, formatDate }) {
  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <div>
        <h3
          className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)] mb-[var(--bb-space-3,0.75rem)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          About {pet.name}
        </h3>
        <p
          className="text-[var(--bb-font-size-sm,0.875rem)] leading-relaxed"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {pet.notes || pet.behaviorNotes || `${pet.name} is a ${pet.age || 'young'} ${pet.breed || pet.species}.`}
        </p>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--bb-space-4,1rem)]">
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
  formatDate,
}) {
  const defaultVaccines = getDefaultVaccines(pet.species);

  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <div>
        <h3
          className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)] mb-[var(--bb-space-4,1rem)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          Vaccinations
        </h3>

        {vaccLoading ? (
          <p style={{ color: 'var(--bb-color-text-muted)' }}>Loading vaccinations…</p>
        ) : (
          <>
            {/* Vaccination Cards */}
            <div className="space-y-[var(--bb-space-3,0.75rem)] mb-[var(--bb-space-6,1.5rem)]">
              {defaultVaccines.map((vaccineType) => {
                const vaccination = getVaccinationForType(vaccineType);
                const status = getVaccinationStatus(vaccination);
                const { label, intent } = getStatusDisplay(status);

                return (
                  <div
                    key={vaccineType}
                    className="flex items-center justify-between p-[var(--bb-space-4,1rem)] border rounded-lg transition-colors"
                    style={{
                      borderColor: 'var(--bb-color-border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: 'var(--bb-color-info-soft)',
                          color: 'var(--bb-color-info)',
                        }}
                      >
                        <Syringe className="h-5 w-5" />
                      </div>
                      <div>
                        <p
                          className="font-[var(--bb-font-weight-medium,500)]"
                          style={{ color: 'var(--bb-color-text-primary)' }}
                        >
                          {vaccineType}
                        </p>
                        {vaccination ? (
                          <p
                            className="text-[var(--bb-font-size-sm,0.875rem)]"
                            style={{ color: 'var(--bb-color-text-muted)' }}
                          >
                            Expires {formatDate(vaccination.expiresAt)}
                          </p>
                        ) : (
                          <p
                            className="text-[var(--bb-font-size-sm,0.875rem)]"
                            style={{ color: 'var(--bb-color-text-muted)' }}
                          >
                            Not recorded
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-[var(--bb-space-2,0.5rem)]">
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
          <h3
            className="text-[var(--bb-font-size-base,1rem)] font-[var(--bb-font-weight-semibold,600)] mb-[var(--bb-space-3,0.75rem)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Medical Notes
          </h3>
          <div
            className="p-[var(--bb-space-4,1rem)] rounded-lg"
            style={{ backgroundColor: 'var(--bb-color-status-negative-soft)' }}
          >
            <p
              className="text-[var(--bb-font-size-sm,0.875rem)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              {pet.medicalNotes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function BookingsTab({ pet, formatDate, calculateDays }) {
  const allBookings = pet?.bookings || [];

  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <div className="flex items-center justify-between">
        <h3
          className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          Booking History
        </h3>
        <span
          className="text-[var(--bb-font-size-sm,0.875rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          {allBookings.length} {allBookings.length === 1 ? 'booking' : 'bookings'}
        </span>
      </div>

      {allBookings.length === 0 ? (
        <p
          className="text-[var(--bb-font-size-sm,0.875rem)] text-center py-[var(--bb-space-8,2rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          No bookings yet
        </p>
      ) : (
        <div className="space-y-[var(--bb-space-3,0.75rem)]">
          {allBookings.map((booking) => (
            <div
              key={booking.recordId}
              className="p-[var(--bb-space-4,1rem)] rounded-lg border transition-colors cursor-pointer"
              style={{
                borderColor: 'var(--bb-color-border-subtle)',
              }}
            >
              <div className="flex items-center justify-between mb-[var(--bb-space-2,0.5rem)]">
                <h4
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                </h4>
                <StatusPill status={booking.status} />
              </div>
              <p
                className="text-[var(--bb-font-size-xs,0.75rem)]"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
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
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <div className="flex items-center justify-between">
        <h3
          className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          Documents
        </h3>
        <Button size="sm">
          <FileText className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
          Upload Document
        </Button>
      </div>

      <p
        className="text-[var(--bb-font-size-sm,0.875rem)] text-center py-[var(--bb-space-8,2rem)]"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        No documents uploaded yet
      </p>
    </div>
  );
}

export default PetDetail;
