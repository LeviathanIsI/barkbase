/**
 * Pet Detail Page - Enterprise 360° View
 * Two-column layout with tabbed content and sticky sidebar
 * Designed as a medical + operational chart for kennel staff
 */

import { useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  PawPrint,
  Edit,
  Trash2,
  Calendar,
  Syringe,
  User,
  Activity,
  Heart,
  FileText,
  Phone,
  Mail,
  CheckCircle,
  Plus,
  AlertTriangle,
  Clock,
  ChevronRight,
  Download,
  Upload,
  ExternalLink,
  Copy,
  ArrowLeft,
  Shield,
  Utensils,
  AlertCircle,
  Dog,
} from 'lucide-react';
import { format, formatDistanceToNow, isAfter, isBefore, startOfToday } from 'date-fns';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
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
import { useBookingsQuery } from '@/features/bookings/api';
import { useQueryClient } from '@tanstack/react-query';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { VaccinationFormModal } from '../components';
import { cn, formatCurrency } from '@/lib/utils';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const safeFormatDate = (dateStr, formatStr = 'MMM d, yyyy') => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return format(date, formatStr);
  } catch {
    return '—';
  }
};

const safeFormatDistance = (dateStr) => {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Never';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Never';
  }
};

const calculateAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  if (years < 1) {
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${months} months`;
  }
  return `${years} ${years === 1 ? 'year' : 'years'} old`;
};

const getStatusVariant = (status) => {
  const statusMap = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    CHECKED_IN: 'success',
    CHECKED_OUT: 'neutral',
    CANCELLED: 'danger',
    COMPLETED: 'success',
  };
  return statusMap[status?.toUpperCase()] || 'neutral';
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard');
};

const calculateDays = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate - startDate;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const PetDetail = () => {
  const { petId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.tenant?.recordId ?? 'unknown');

  // Global slideout
  const { openSlideout } = useSlideout();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [vaccinationModalOpen, setVaccinationModalOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState(null);
  const [selectedVaccineType, setSelectedVaccineType] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vaccinationToDelete, setVaccinationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePetDialogOpen, setDeletePetDialogOpen] = useState(false);
  const [isDeletingPet, setIsDeletingPet] = useState(false);
  const [bookingFilter, setBookingFilter] = useState('all');

  // API Queries
  const petQuery = usePetQuery(petId);
  const { data: vaccinations = [], isLoading: vaccLoading } = usePetVaccinationsQuery(petId);
  const { data: allBookingsData } = useBookingsQuery({});
  const pet = petQuery.data;

  // Mutations
  const deletePetMutation = useDeletePetMutation();
  const updatePetMutation = useUpdatePetMutation(petId);
  const createVaccinationMutation = useCreateVaccinationMutation(petId);
  const updateVaccinationMutation = useUpdateVaccinationMutation(petId);
  const deleteVaccinationMutation = useDeleteVaccinationMutation(petId);

  // Derived data
  const petBookings = useMemo(() => {
    if (!allBookingsData || !petId) return [];
    const bookingsArray = Array.isArray(allBookingsData) 
      ? allBookingsData 
      : (allBookingsData?.data ?? allBookingsData?.bookings ?? []);
    return bookingsArray.filter(b => b.petId === petId || b.pets?.some(p => p.recordId === petId));
  }, [allBookingsData, petId]);

  const { upcomingBookings, recentBookings, totalStays, lastVisitDate } = useMemo(() => {
    const today = startOfToday();
    const upcoming = petBookings
      .filter(b => isAfter(new Date(b.checkIn), today) && b.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))
      .slice(0, 3);
    const recent = petBookings
      .filter(b => isBefore(new Date(b.checkIn), today) || b.status === 'CHECKED_OUT' || b.status === 'COMPLETED')
      .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))
      .slice(0, 3);
    const completedStays = petBookings.filter(b => 
      b.status === 'COMPLETED' || b.status === 'CHECKED_OUT'
    ).length;
    const lastVisit = recent[0]?.checkOut || recent[0]?.checkIn;
    return { 
      upcomingBookings: upcoming, 
      recentBookings: recent, 
      totalStays: completedStays,
      lastVisitDate: lastVisit 
    };
  }, [petBookings]);

  const filteredBookings = useMemo(() => {
    const today = startOfToday();
    switch (bookingFilter) {
      case 'upcoming':
        return petBookings.filter(b => isAfter(new Date(b.checkIn), today) && b.status !== 'CANCELLED');
      case 'past':
        return petBookings.filter(b => isBefore(new Date(b.checkOut || b.checkIn), today) || b.status === 'COMPLETED');
      case 'cancelled':
        return petBookings.filter(b => b.status === 'CANCELLED');
      default:
        return petBookings;
    }
  }, [petBookings, bookingFilter]);

  // Vaccination helpers
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

  const vaccinationsSummary = useMemo(() => {
    if (!pet?.species) return { status: 'unknown', overdue: 0, dueSoon: 0 };
    const defaults = getDefaultVaccines(pet.species);
    let overdue = 0;
    let dueSoon = 0;
    defaults.forEach(type => {
      const vacc = getVaccinationForType(type);
      const status = getVaccinationStatus(vacc);
      if (status === 'expired' || status === 'missing') overdue++;
      else if (status === 'expiring') dueSoon++;
    });
    if (overdue > 0) return { status: 'overdue', overdue, dueSoon };
    if (dueSoon > 0) return { status: 'due-soon', overdue, dueSoon };
    return { status: 'up-to-date', overdue, dueSoon };
  }, [pet?.species, vaccinations]);

  // Handlers
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

  const handleEdit = () => {
    openSlideout(SLIDEOUT_TYPES.PET_EDIT, { pet });
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

  // Loading state
  if (petQuery.isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8"><Skeleton className="h-96" /></div>
          <div className="col-span-4"><Skeleton className="h-96" /></div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <PawPrint className="w-16 h-16 mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Pet not found
        </h2>
        <p className="mt-2" style={{ color: 'var(--bb-color-text-muted)' }}>
          This pet may have been deleted or you don't have access.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate('/pets')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pets
        </Button>
      </div>
    );
  }

  const primaryOwner = pet.owners?.[0];
  const currentBooking = pet.currentBooking || petBookings?.find(b => b.status === 'CHECKED_IN');
  const petDescription = [pet.breed, pet.species].filter(Boolean).join(' • ');
  const petAge = calculateAge(pet.dateOfBirth) || pet.age;
  const hasAlerts = pet.medicalNotes || pet.behaviorNotes || pet.dietaryNotes;

  return (
    <>
      <div className="space-y-6">
        {/* ================================================================
            HEADER
        ================================================================ */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
              <Link 
                to="/pets" 
                className="flex items-center gap-1 hover:text-[color:var(--bb-color-text-primary)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Pets
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span style={{ color: 'var(--bb-color-text-primary)' }}>{pet.name}</span>
            </nav>
            
            {/* Title & Status */}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 
                className="text-2xl font-semibold truncate"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                {pet.name}
              </h1>
              <Badge variant={currentBooking ? 'success' : 'neutral'}>
                {currentBooking ? 'Currently Boarding' : 'Not Checked In'}
              </Badge>
              {hasAlerts && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Alerts
                </Badge>
              )}
            </div>
            
            {/* Subtitle */}
            <p className="mt-1 text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              {petDescription} {petAge && `• ${petAge}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="primary" onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { petId, ownerId: primaryOwner?.recordId })}>
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
            <Button variant="secondary" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="ghost" onClick={handleDelete} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* ================================================================
            METRICS STRIP
        ================================================================ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard 
            label="Total Stays" 
            value={totalStays || pet.bookings?.length || 0} 
          />
          <MetricCard 
            label="Last Visit" 
            value={safeFormatDistance(lastVisitDate || pet.lastVetVisit)} 
          />
          <MetricCard 
            label="Next Booking" 
            value={upcomingBookings[0] ? safeFormatDate(upcomingBookings[0].checkIn) : 'None'} 
          />
          <MetricCard 
            label="Vaccinations" 
            value={vaccinationsSummary.status === 'up-to-date' ? 'Up to date' : 
                   vaccinationsSummary.status === 'due-soon' ? `${vaccinationsSummary.dueSoon} due soon` :
                   `${vaccinationsSummary.overdue} overdue`}
            variant={vaccinationsSummary.status === 'up-to-date' ? 'success' : 
                    vaccinationsSummary.status === 'due-soon' ? 'warning' : 'danger'}
          />
        </div>

        {/* ================================================================
            TWO-COLUMN LAYOUT
        ================================================================ */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN: Pet Summary + Tabbed Content */}
          <div className="lg:col-span-8 space-y-6">
            {/* Pet Summary Card */}
            <PetSummaryCard pet={pet} currentBooking={currentBooking} />

            {/* Tabbed Content */}
            <Card className="overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                  <TabsList className="w-full justify-start px-4 h-12 bg-transparent">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="health" className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Health
                    </TabsTrigger>
                    <TabsTrigger value="bookings" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Bookings
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documents
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6">
                  <TabsContent value="overview" className="mt-0">
                    <OverviewTab 
                      pet={pet}
                      upcomingBookings={upcomingBookings}
                      recentBookings={recentBookings}
                      vaccinationsSummary={vaccinationsSummary}
                      onSwitchToHealth={() => setActiveTab('health')}
                      onSwitchToBookings={() => setActiveTab('bookings')}
                    />
                  </TabsContent>

                  <TabsContent value="health" className="mt-0">
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
                      onEdit={handleEdit}
                    />
                  </TabsContent>

                  <TabsContent value="bookings" className="mt-0">
                    <BookingsTab 
                      bookings={filteredBookings}
                      filter={bookingFilter}
                      onFilterChange={setBookingFilter}
                      petId={petId}
                    />
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0">
                    <DocumentsTab pet={pet} />
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>

          {/* RIGHT COLUMN: Sticky Sidebar */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Current Stay Card */}
              {currentBooking && (
                <CurrentStayCard booking={currentBooking} />
              )}

              {/* Owner Card */}
              {primaryOwner && (
                <PetOwnerCard owner={primaryOwner} />
              )}

              {/* Quick Actions */}
              <PetQuickActions 
                owner={primaryOwner} 
                petId={petId} 
                currentBooking={currentBooking}
              />

              {/* Notes/Alerts Card */}
              <NotesAlertsCard pet={pet} />

              {/* Other Owners */}
              {pet.owners && pet.owners.length > 1 && (
                <OtherOwnersCard owners={pet.owners.slice(1)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          MODALS
      ================================================================ */}
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

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

function MetricCard({ label, value, variant = 'neutral' }) {
  const variantStyles = {
    success: 'var(--bb-color-status-positive)',
    warning: 'var(--bb-color-status-caution)',
    danger: 'var(--bb-color-status-negative)',
    neutral: 'var(--bb-color-text-primary)',
  };

  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
        {label}
      </p>
      <p className="text-lg font-semibold" style={{ color: variantStyles[variant] }}>
        {value}
      </p>
    </Card>
  );
}

// ============================================================================
// PET SUMMARY CARD
// ============================================================================

function PetSummaryCard({ pet, currentBooking }) {
  const petAge = calculateAge(pet.dateOfBirth) || pet.age;

  const fields = [
    { label: 'Breed', value: pet.breed },
    { label: 'Species', value: pet.species },
    { label: 'Gender', value: pet.gender },
    { label: 'Weight', value: pet.weight ? `${pet.weight} lbs` : null },
    { label: 'Color', value: pet.color },
    { label: 'Age', value: petAge },
    { label: 'Microchip', value: pet.microchipNumber },
    { label: 'Last Vet Visit', value: safeFormatDate(pet.lastVetVisit) },
  ];

  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div 
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--bb-color-accent-soft)', color: 'var(--bb-color-accent)' }}
        >
          <PawPrint className="h-8 w-8" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
              {pet.name}
            </h2>
            {currentBooking && (
              <Badge variant="success">In Facility</Badge>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
            {[pet.breed, pet.species, pet.gender].filter(Boolean).join(' • ')}
          </p>
          
          {/* Risk Badges */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {pet.medicalNotes && (
              <Badge variant="danger" className="flex items-center gap-1 text-xs">
                <AlertCircle className="w-3 h-3" />
                Medical Alert
              </Badge>
            )}
            {pet.behaviorNotes && (
              <Badge variant="warning" className="flex items-center gap-1 text-xs">
                <Shield className="w-3 h-3" />
                Behavior Note
              </Badge>
            )}
            {pet.dietaryNotes && (
              <Badge variant="info" className="flex items-center gap-1 text-xs">
                <Utensils className="w-3 h-3" />
                Special Diet
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Fields Grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
              {label}
            </p>
            <p className="text-sm" style={{ color: value ? 'var(--bb-color-text-primary)' : 'var(--bb-color-text-muted)' }}>
              {value || '—'}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// CURRENT STAY CARD
// ============================================================================

function CurrentStayCard({ booking }) {
  return (
    <Card className="p-5" style={{ borderColor: 'var(--bb-color-status-positive)', borderWidth: '2px' }}>
      <div className="flex items-center gap-2 mb-4">
        <div 
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--bb-color-status-positive-soft)', color: 'var(--bb-color-status-positive)' }}
        >
          <CheckCircle className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--bb-color-status-positive)' }}>
          Current Stay
        </h3>
      </div>
      
      <div className="space-y-3">
        <InfoRow label="Status" value={<Badge variant="success">Checked In</Badge>} />
        <InfoRow label="Room" value={booking.roomNumber || booking.kennelName || '—'} />
        <InfoRow label="Check-In" value={safeFormatDate(booking.checkIn)} />
        <InfoRow label="Check-Out" value={safeFormatDate(booking.checkOut)} />
        <InfoRow 
          label="Duration" 
          value={`${calculateDays(booking.checkIn, booking.checkOut)} days`} 
        />
      </div>
    </Card>
  );
}

// ============================================================================
// PET OWNER CARD
// ============================================================================

function PetOwnerCard({ owner }) {
  const navigate = useNavigate();
  const ownerName = owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim();

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
        Owner
      </h3>
      
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--bb-color-purple-soft)', color: 'var(--bb-color-purple)' }}
        >
          <User className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate" style={{ color: 'var(--bb-color-text-primary)' }}>
            {ownerName}
          </p>
          <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
            Primary Owner
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        {owner.email && (
          <div className="flex items-center gap-2 group">
            <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--bb-color-text-muted)' }} />
            <a 
              href={`mailto:${owner.email}`}
              className="text-sm truncate flex-1 hover:underline"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              {owner.email}
            </a>
            <button 
              onClick={() => copyToClipboard(owner.email)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Copy className="w-3.5 h-3.5" style={{ color: 'var(--bb-color-text-muted)' }} />
            </button>
          </div>
        )}
        {owner.phone && (
          <div className="flex items-center gap-2 group">
            <Phone className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--bb-color-text-muted)' }} />
            <a 
              href={`tel:${owner.phone}`}
              className="text-sm flex-1 hover:underline"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              {owner.phone}
            </a>
            <button 
              onClick={() => copyToClipboard(owner.phone)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Copy className="w-3.5 h-3.5" style={{ color: 'var(--bb-color-text-muted)' }} />
            </button>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => navigate(`/customers/${owner.recordId}`)}
      >
        View Owner Profile
        <ExternalLink className="w-3.5 h-3.5 ml-2" />
      </Button>
    </Card>
  );
}

// ============================================================================
// PET QUICK ACTIONS
// ============================================================================

function PetQuickActions({ owner, petId, currentBooking }) {
  const { openSlideout } = useSlideout();

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
        Quick Actions
      </h3>
      
      <div className="space-y-2">
        {owner?.phone && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open(`tel:${owner.phone}`)}
          >
            <Phone className="w-4 h-4 mr-2" />
            Call Owner
          </Button>
        )}

        {owner?.email && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => window.open(`mailto:${owner.email}`)}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email Owner
          </Button>
        )}

        <Button
          variant="primary"
          size="sm"
          className="w-full justify-start"
          onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { petId, ownerId: owner?.recordId })}
        >
          <Calendar className="w-4 h-4 mr-2" />
          Book Stay
        </Button>

        {currentBooking && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => toast.info('Check out feature coming soon')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Check Out
          </Button>
        )}
      </div>
    </Card>
  );
}

// ============================================================================
// NOTES/ALERTS CARD
// ============================================================================

function NotesAlertsCard({ pet }) {
  const hasNotes = pet.medicalNotes || pet.behaviorNotes || pet.dietaryNotes;

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
        Notes & Alerts
      </h3>

      {hasNotes ? (
        <div className="space-y-3">
          {pet.medicalNotes && (
            <AlertNote 
              icon={AlertCircle}
              label="Medical"
              content={pet.medicalNotes}
              variant="danger"
            />
          )}
          {pet.behaviorNotes && (
            <AlertNote 
              icon={Shield}
              label="Behavior"
              content={pet.behaviorNotes}
              variant="warning"
            />
          )}
          {pet.dietaryNotes && (
            <AlertNote 
              icon={Utensils}
              label="Dietary"
              content={pet.dietaryNotes}
              variant="info"
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-center py-4" style={{ color: 'var(--bb-color-text-muted)' }}>
          No critical notes added yet
        </p>
      )}
    </Card>
  );
}

function AlertNote({ icon: Icon, label, content, variant }) {
  const bgColors = {
    danger: 'var(--bb-color-status-negative-soft)',
    warning: 'var(--bb-color-status-caution-soft)',
    info: 'var(--bb-color-info-soft)',
  };
  const iconColors = {
    danger: 'var(--bb-color-status-negative)',
    warning: 'var(--bb-color-status-caution)',
    info: 'var(--bb-color-info)',
  };

  return (
    <div className="p-3 rounded-lg" style={{ backgroundColor: bgColors[variant] }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: iconColors[variant] }} />
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: iconColors[variant] }}>
          {label}
        </span>
      </div>
      <p className="text-sm line-clamp-3" style={{ color: 'var(--bb-color-text-primary)' }}>
        {content}
      </p>
    </div>
  );
}

// ============================================================================
// OTHER OWNERS CARD
// ============================================================================

function OtherOwnersCard({ owners }) {
  const navigate = useNavigate();

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--bb-color-text-muted)' }}>
        Other Owners
      </h3>
      <div className="space-y-2">
        {owners.map(owner => (
          <button
            key={owner.recordId}
            onClick={() => navigate(`/customers/${owner.recordId}`)}
            className="w-full p-3 rounded-lg text-left transition-colors border hover:bg-[color:var(--bb-color-bg-elevated)]"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              {owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim()}
            </p>
            <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
              {owner.email}
            </p>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ============================================================================
// INFO ROW HELPER
// ============================================================================

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>{label}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
        {typeof value === 'string' ? value : value}
      </span>
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ pet, upcomingBookings, recentBookings, vaccinationsSummary, onSwitchToHealth, onSwitchToBookings }) {
  return (
    <div className="space-y-8">
      {/* About Section */}
      <section>
        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--bb-color-text-primary)' }}>
          About {pet.name}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--bb-color-text-muted)' }}>
          {pet.notes || pet.description || `${pet.name} is a ${calculateAge(pet.dateOfBirth) || ''} ${pet.breed || pet.species || 'pet'}.`}
        </p>
      </section>

      {/* Health Summary Chips */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--bb-color-text-muted)' }}>
          Health Summary
        </h3>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={onSwitchToHealth}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              vaccinationsSummary.status === 'up-to-date' 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : vaccinationsSummary.status === 'due-soon'
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            <Syringe className="w-3.5 h-3.5 inline mr-1.5" />
            Vaccinations: {vaccinationsSummary.status === 'up-to-date' ? 'Up to date' : 
                          vaccinationsSummary.status === 'due-soon' ? 'Due soon' : 'Overdue'}
          </button>
          
          <button 
            onClick={onSwitchToHealth}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              pet.medicalNotes 
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" />
            Medical: {pet.medicalNotes ? 'Alert' : 'None'}
          </button>

          <button 
            onClick={onSwitchToHealth}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              pet.dietaryNotes 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            <Utensils className="w-3.5 h-3.5 inline mr-1.5" />
            Diet: {pet.dietaryNotes ? 'Special' : 'Standard'}
          </button>

          <button 
            onClick={onSwitchToHealth}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
              pet.behaviorNotes 
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            <Shield className="w-3.5 h-3.5 inline mr-1.5" />
            Behavior: {pet.behaviorNotes ? 'Needs caution' : 'Normal'}
          </button>
        </div>
      </section>

      {/* Upcoming & Recent Bookings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
            Bookings
          </h3>
          <button 
            onClick={onSwitchToBookings}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--bb-color-accent)' }}
          >
            View all →
          </button>
        </div>

        {upcomingBookings.length === 0 && recentBookings.length === 0 ? (
          <div 
            className="text-center py-8 rounded-lg border-2 border-dashed"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--bb-color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              No bookings yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingBookings.map(booking => (
              <BookingRow key={booking.recordId} booking={booking} type="upcoming" />
            ))}
            {recentBookings.slice(0, 2).map(booking => (
              <BookingRow key={booking.recordId} booking={booking} type="past" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BookingRow({ booking, type }) {
  const navigate = useNavigate();
  
  return (
    <button
      onClick={() => navigate(`/bookings/${booking.recordId}`)}
      className="w-full p-3 rounded-lg border text-left transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]"
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              type === 'upcoming' 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              {safeFormatDate(booking.checkIn)} - {safeFormatDate(booking.checkOut)}
            </p>
            <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
              {booking.serviceName || booking.serviceType || 'Boarding'} • {calculateDays(booking.checkIn, booking.checkOut)} days
            </p>
          </div>
        </div>
        <Badge variant={getStatusVariant(booking.status)}>
          {booking.status?.replace(/_/g, ' ')}
        </Badge>
      </div>
    </button>
  );
}

// ============================================================================
// HEALTH TAB
// ============================================================================

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
  onEdit,
}) {
  const defaultVaccines = getDefaultVaccines(pet.species);

  return (
    <div className="space-y-8">
      {/* Vaccinations Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            Vaccinations
          </h3>
          <Button size="sm" variant="outline" onClick={() => handleAddVaccination('')}>
            <Plus className="w-4 h-4 mr-1" />
            Add Vaccine
          </Button>
        </div>

        {vaccLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {defaultVaccines.map((vaccineType) => {
              const vaccination = getVaccinationForType(vaccineType);
              const status = getVaccinationStatus(vaccination);
              const { label, intent } = getStatusDisplay(status);

              return (
                <div
                  key={vaccineType}
                  className="flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'var(--bb-color-info-soft)', color: 'var(--bb-color-info)' }}
                    >
                      <Syringe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {vaccineType}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                        {vaccination 
                          ? `Expires ${safeFormatDate(vaccination.expiresAt)}`
                          : 'Not recorded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill intent={intent}>{label}</StatusPill>
                    {vaccination ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleEditVaccination(vaccination)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(vaccination)}>
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleAddVaccination(vaccineType)}>
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Medical Notes Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            Medical Notes
          </h3>
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
        
        {pet.medicalNotes ? (
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--bb-color-status-negative-soft)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--bb-color-status-negative)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--bb-color-status-negative)' }}>
                Medical Alert
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
              {pet.medicalNotes}
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No medical conditions or medications recorded.
          </p>
        )}
      </section>

      {/* Behavior & Handling Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Behavior & Handling
        </h3>
        
        {pet.behaviorNotes ? (
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--bb-color-status-caution-soft)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4" style={{ color: 'var(--bb-color-status-caution)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--bb-color-status-caution)' }}>
                Behavior Notes
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
              {pet.behaviorNotes}
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No special handling instructions recorded.
          </p>
        )}
      </section>

      {/* Diet & Feeding Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Diet & Feeding
        </h3>
        
        {pet.dietaryNotes ? (
          <div 
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'var(--bb-color-info-soft)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4" style={{ color: 'var(--bb-color-info)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--bb-color-info)' }}>
                Special Diet
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
              {pet.dietaryNotes}
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            Standard diet. No restrictions or special requirements.
          </p>
        )}
      </section>
    </div>
  );
}

// ============================================================================
// BOOKINGS TAB
// ============================================================================

function BookingsTab({ bookings, filter, onFilterChange, petId }) {
  const navigate = useNavigate();
  const { openSlideout } = useSlideout();

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                filter === f.value
                  ? "bg-[color:var(--bb-color-accent)] text-white"
                  : "bg-[color:var(--bb-color-bg-elevated)] text-[color:var(--bb-color-text-muted)] hover:text-[color:var(--bb-color-text-primary)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { petId })}>
          <Plus className="w-4 h-4 mr-1" />
          New Booking
        </Button>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div 
          className="text-center py-12 rounded-lg border-2 border-dashed"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--bb-color-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            No {filter !== 'all' ? filter : ''} bookings
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
            {filter === 'all' ? 'Schedule a booking to get started' : `No ${filter} bookings found`}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Dates
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Service
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Kennel
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              {bookings.map(booking => (
                <tr 
                  key={booking.recordId}
                  onClick={() => navigate(`/bookings/${booking.recordId}`)}
                  className="cursor-pointer transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]"
                >
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                      {safeFormatDate(booking.checkIn)} - {safeFormatDate(booking.checkOut)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                      {calculateDays(booking.checkIn, booking.checkOut)} days
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {booking.serviceName || booking.serviceType || 'Boarding'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getStatusVariant(booking.status)}>
                      {booking.status?.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {booking.kennelName || booking.roomNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {booking.totalPriceInCents 
                      ? formatCurrency(booking.totalPriceInCents / 100)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DOCUMENTS TAB
// ============================================================================

function DocumentsTab({ pet }) {
  const documents = pet.documents || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Documents
        </h3>
        <Button size="sm" onClick={() => toast.info('Document upload coming soon')}>
          <Upload className="w-4 h-4 mr-1" />
          Upload Document
        </Button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div 
          className="text-center py-12 rounded-lg border-2 border-dashed"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--bb-color-text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            No documents uploaded
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
            Upload vaccination records, vet reports, or liability forms
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => toast.info('Document upload coming soon')}>
            <Upload className="w-4 h-4 mr-1" />
            Upload First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div
              key={doc.recordId}
              className="flex items-center justify-between p-4 border rounded-lg"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
                >
                  <FileText className="w-5 h-5" style={{ color: 'var(--bb-color-text-muted)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {doc.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {doc.type} • Uploaded {safeFormatDate(doc.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost">
                  <ExternalLink className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PetDetail;
