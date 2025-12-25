/**
 * Pet Detail Page - Enterprise 360° View
 * Two-column layout with tabbed content and sticky sidebar
 * Designed as a medical + operational chart for kennel staff
 */

import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePetParams } from '@/lib/useRecordParams';
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
  ChevronDown,
  Download,
  Upload,
  ExternalLink,
  Copy,
  ArrowLeft,
  Shield,
  Utensils,
  AlertCircle,
  Dog,
  RefreshCw,
  MapPin,
  Weight,
  Palette,
  Hash,
  MessageSquare,
  Archive,
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
  usePetOwnersQuery,
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
import { VaccinationFormModal, RenewVaccinationModal } from '../components';
import { cn, formatCurrency } from '@/lib/utils';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import apiClient from '@/lib/apiClient';
import { ActivityTimeline } from '@/features/activities';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';
import { getBirthdateFromPet, getFormattedAgeFromPet, formatAgeFromBirthdate } from '../utils/pet-date-utils';
import { PropertyCard, PropertyList } from '@/components/ui/PropertyCard';
import { AssociationCard, AssociationItem } from '@/components/ui/AssociationCard';
import { EditablePropertyList, EditablePropertyProvider } from '@/components/ui/EditableProperty';

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

// calculateAge uses the shared utility from pet-date-utils
const calculateAge = (dob) => formatAgeFromBirthdate(dob);

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
  // Extract petId from either old (/pets/:petId) or new (/pets/:accountCode/record/:typeCode/:recordId) URL pattern
  const { id: petId } = usePetParams();
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

  // Renewal modal state
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [vaccinationToRenew, setVaccinationToRenew] = useState(null);
  const [isRenewing, setIsRenewing] = useState(false);

  // API Queries
  const petQuery = usePetQuery(petId);
  const { data: vaccinations = [], isLoading: vaccLoading } = usePetVaccinationsQuery(petId);
  const { data: petOwners = [] } = usePetOwnersQuery(petId);
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

  // Vaccination helpers - required vaccines are needed for boarding
  const getDefaultVaccines = (species) => {
    if (species === 'Dog') {
      return [
        { name: 'Rabies', required: true },
        { name: 'DHPP', required: true, label: 'DHPP/Distemper' },
        { name: 'Bordetella', required: true, label: 'Bordetella/Kennel Cough' },
        { name: 'Canine Influenza', required: false },
        { name: 'Leptospirosis', required: false },
        { name: 'Lyme', required: false },
      ];
    } else if (species === 'Cat') {
      return [
        { name: 'Rabies', required: true },
        { name: 'FVRCP', required: true, label: 'FVRCP/Feline Distemper' },
        { name: 'FeLV', required: false },
      ];
    }
    return [
      { name: 'Rabies', required: true },
      { name: 'DHPP', required: true },
      { name: 'Bordetella', required: true },
    ];
  };

  // Get only required vaccines for a species
  const getRequiredVaccines = (species) => {
    return getDefaultVaccines(species).filter(v => v.required);
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
    // Handle both string and object types
    const typeName = typeof type === 'object' ? type.name : type;
    const normalizedType = normalizeVaccineType(typeName);
    const matchingVaccinations = vaccinations.filter(v => normalizeVaccineType(v.type) === normalizedType);
    return matchingVaccinations.sort((a, b) => new Date(b.administeredAt) - new Date(a.administeredAt))[0];
  };

  const vaccinationsSummary = useMemo(() => {
    if (!pet?.species) return { status: 'unknown', overdue: 0, dueSoon: 0, missingRequired: [] };
    const requiredVaccines = getRequiredVaccines(pet.species);

    // If no vaccination records exist at all, show "none" status with all required as missing
    if (!vaccinations || vaccinations.length === 0) {
      return { status: 'none', overdue: 0, dueSoon: 0, missingRequired: requiredVaccines };
    }

    let overdue = 0;
    let dueSoon = 0;
    const missingRequired = [];

    requiredVaccines.forEach(vaccine => {
      const vacc = getVaccinationForType(vaccine.name);
      const status = getVaccinationStatus(vacc);
      if (status === 'expired') overdue++;
      else if (status === 'expiring') dueSoon++;
      else if (status === 'missing') missingRequired.push(vaccine);
    });

    if (overdue > 0) return { status: 'overdue', overdue, dueSoon, missingRequired };
    if (dueSoon > 0) return { status: 'due-soon', overdue, dueSoon, missingRequired };
    if (missingRequired.length > 0) return { status: 'incomplete', overdue, dueSoon, missingRequired };
    return { status: 'up-to-date', overdue, dueSoon, missingRequired: [] };
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

  // Renewal handlers
  const handleRenewClick = (vaccination) => {
    setVaccinationToRenew(vaccination);
    setRenewModalOpen(true);
  };

  const handleRenewSubmit = async (data) => {
    if (!vaccinationToRenew) return;

    const vaccinationId = vaccinationToRenew.recordId || vaccinationToRenew.id;
    if (!vaccinationId) {
      toast.error('Unable to identify vaccination record');
      return;
    }

    setIsRenewing(true);
    try {
      await apiClient.post(
        canonicalEndpoints.pets.vaccinationRenew(
          String(petId),
          String(vaccinationId)
        ),
        {
          administeredAt: data.administeredAt,
          expiresAt: data.expiresAt,
          provider: data.provider || null,
          lotNumber: data.lotNumber || null,
          notes: data.notes || null,
        }
      );

      toast.success(`${vaccinationToRenew.type} renewed successfully`);
      setRenewModalOpen(false);
      setVaccinationToRenew(null);

      // Refresh the vaccinations data - use correct query key format
      queryClient.invalidateQueries({ queryKey: ['petVaccinations'] });
    } catch (error) {
      console.error('Failed to renew vaccination:', error);
      toast.error(error.response?.data?.message || 'Failed to renew vaccination');
    } finally {
      setIsRenewing(false);
    }
  };

  const handleRenewCancel = () => {
    setRenewModalOpen(false);
    setVaccinationToRenew(null);
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

  // Use owners from dedicated query (falls back to pet.owners for backwards compat)
  const owners = petOwners.length > 0 ? petOwners : (pet.owners || []);
  const primaryOwner = owners.find(o => o.is_primary) || owners[0];
  const currentBooking = pet.currentBooking || petBookings?.find(b => b.status === 'CHECKED_IN');
  const petDescription = [pet.breed, pet.species].filter(Boolean).join(' • ');
  const petAge = getFormattedAgeFromPet(pet) || pet.age;
  const hasAlerts = pet.medicalNotes || pet.behaviorNotes || pet.dietaryNotes;

  // Handler for inline property edits
  const handlePropertySave = async (fieldKey, value) => {
    try {
      await updatePetMutation.mutateAsync({ [fieldKey]: value });
      toast.success('Updated successfully');
    } catch (err) {
      toast.error('Failed to update');
      throw err;
    }
  };

  // Prepare property lists for left sidebar (editable)
  const aboutProperties = [
    { label: 'Species', value: pet.species, fieldKey: 'species', type: 'single-select', options: ['Dog', 'Cat', 'Other'] },
    { label: 'Breed', value: pet.breed, fieldKey: 'breed', type: 'text' },
    { label: 'Gender', value: pet.gender, fieldKey: 'gender', type: 'single-select', options: ['Male', 'Female', 'Unknown'] },
    { label: 'Age', value: petAge, fieldKey: null, type: 'text' }, // Computed, not editable
    { label: 'Date of Birth', value: pet.dateOfBirth, fieldKey: 'dateOfBirth', type: 'date' },
  ];

  const physicalProperties = [
    { label: 'Weight', value: pet.weight, fieldKey: 'weight', type: 'number', suffix: ' lbs' },
    { label: 'Color', value: pet.color, fieldKey: 'color', type: 'text' },
    { label: 'Size', value: pet.size, fieldKey: 'size', type: 'single-select', options: ['Small', 'Medium', 'Large', 'Extra Large'] },
    { label: 'Microchip #', value: pet.microchipNumber, fieldKey: 'microchipNumber', type: 'text' },
  ];

  const veterinaryProperties = [
    { label: 'Spayed/Neutered', value: pet.isSpayedNeutered, fieldKey: 'isSpayedNeutered', type: 'boolean' },
    { label: 'Last Vet Visit', value: pet.lastVetVisit, fieldKey: 'lastVetVisit', type: 'date' },
    { label: 'Vet Name', value: pet.vetName, fieldKey: 'vetName', type: 'text' },
    { label: 'Vet Phone', value: pet.vetPhone, fieldKey: 'vetPhone', type: 'phone' },
  ];

  return (
    <>
      <div className="h-full flex flex-col">
        {/* ================================================================
            HEADER
        ================================================================ */}
        <div
          className="flex-shrink-0 px-6 py-4 border-b"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
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
        </div>

        {/* ================================================================
            THREE-COLUMN LAYOUT
        ================================================================ */}
        <div className="flex-1 flex overflow-hidden">
          {/* ============================================================
              LEFT SIDEBAR - Property Cards (420px fixed)
          ============================================================ */}
          <EditablePropertyProvider>
          <aside
            className="w-[420px] min-w-[420px] flex-shrink-0 border-r overflow-y-auto p-4 space-y-4"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {/* About this Pet */}
            <PropertyCard
              title="About this Pet"
              storageKey={`pet-about-${petId}`}
              icon={PawPrint}
            >
              <EditablePropertyList
                properties={aboutProperties.filter(p => p.fieldKey !== null)}
                onSave={handlePropertySave}
              />
              {/* Age is computed, show as read-only */}
              <div className="mt-4">
                <dt className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                  Age
                </dt>
                <dd className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {petAge || '—'}
                </dd>
              </div>
            </PropertyCard>

            {/* Physical Details */}
            <PropertyCard
              title="Physical Details"
              storageKey={`pet-physical-${petId}`}
              icon={Weight}
            >
              <EditablePropertyList
                properties={physicalProperties}
                onSave={handlePropertySave}
              />
            </PropertyCard>

            {/* Veterinary Info */}
            <PropertyCard
              title="Veterinary Info"
              storageKey={`pet-vet-${petId}`}
              icon={Syringe}
            >
              <EditablePropertyList
                properties={veterinaryProperties}
                onSave={handlePropertySave}
              />
            </PropertyCard>

            {/* Care Notes */}
            <PropertyCard
              title="Care Notes"
              storageKey={`pet-notes-${petId}`}
              icon={MessageSquare}
            >
              {pet.medicalNotes || pet.behaviorNotes || pet.dietaryNotes || pet.notes ? (
                <div className="space-y-3">
                  {pet.medicalNotes && (
                    <div
                      className="p-2 rounded-md text-xs"
                      style={{ backgroundColor: 'var(--bb-color-status-negative-soft)' }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <AlertCircle className="w-3 h-3" style={{ color: 'var(--bb-color-status-negative)' }} />
                        <span className="font-semibold" style={{ color: 'var(--bb-color-status-negative)' }}>Medical</span>
                      </div>
                      <p style={{ color: 'var(--bb-color-text-primary)' }}>{pet.medicalNotes}</p>
                    </div>
                  )}
                  {pet.behaviorNotes && (
                    <div
                      className="p-2 rounded-md text-xs"
                      style={{ backgroundColor: 'var(--bb-color-status-caution-soft)' }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Shield className="w-3 h-3" style={{ color: 'var(--bb-color-status-caution)' }} />
                        <span className="font-semibold" style={{ color: 'var(--bb-color-status-caution)' }}>Behavior</span>
                      </div>
                      <p style={{ color: 'var(--bb-color-text-primary)' }}>{pet.behaviorNotes}</p>
                    </div>
                  )}
                  {pet.dietaryNotes && (
                    <div
                      className="p-2 rounded-md text-xs"
                      style={{ backgroundColor: 'var(--bb-color-info-soft)' }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Utensils className="w-3 h-3" style={{ color: 'var(--bb-color-info)' }} />
                        <span className="font-semibold" style={{ color: 'var(--bb-color-info)' }}>Dietary</span>
                      </div>
                      <p style={{ color: 'var(--bb-color-text-primary)' }}>{pet.dietaryNotes}</p>
                    </div>
                  )}
                  {pet.notes && (
                    <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                      {pet.notes}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                  No care notes recorded
                </p>
              )}
            </PropertyCard>
          </aside>
          </EditablePropertyProvider>

          {/* ============================================================
              MIDDLE COLUMN - Stats + Tabs (flex-1)
          ============================================================ */}
          <main className="flex-1 min-w-0 overflow-y-auto">
            {/* Stats Bar */}
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div className="grid grid-cols-4 gap-4">
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
                         vaccinationsSummary.status === 'none' ? 'Not on file' :
                         vaccinationsSummary.status === 'due-soon' ? `${vaccinationsSummary.dueSoon} due soon` :
                         vaccinationsSummary.status === 'incomplete' ? `${vaccinationsSummary.missingRequired?.length} missing` :
                         `${vaccinationsSummary.overdue} overdue`}
                  variant={vaccinationsSummary.status === 'up-to-date' ? 'success' :
                          vaccinationsSummary.status === 'none' ? 'neutral' :
                          vaccinationsSummary.status === 'due-soon' ? 'warning' :
                          vaccinationsSummary.status === 'incomplete' ? 'warning' : 'danger'}
                />
              </div>
            </div>

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <TabsList className="w-full justify-start px-6 h-12 bg-transparent">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Activity
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
                    handleRenewClick={handleRenewClick}
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
                  <DocumentsTab pet={pet} onUpdatePet={updatePetMutation.mutateAsync} />
                </TabsContent>

                <TabsContent value="activity" className="mt-0">
                  <ActivityTimeline
                    entityType="pet"
                    entityId={petId}
                    defaultEmail={primaryOwner?.email}
                    defaultPhone={primaryOwner?.phone}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </main>

          {/* ============================================================
              RIGHT SIDEBAR - Associations (460px fixed)
          ============================================================ */}
          <aside
            className="w-[460px] min-w-[460px] flex-shrink-0 border-l overflow-y-auto p-4 space-y-4"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {/* Current Stay */}
            {currentBooking && (
              <Card className="p-4" style={{ borderColor: 'var(--bb-color-status-positive)', borderWidth: '2px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'var(--bb-color-status-positive-soft)', color: 'var(--bb-color-status-positive)' }}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--bb-color-status-positive)' }}>
                    Current Stay
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--bb-color-text-muted)' }}>Kennel</span>
                    <span className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                      {currentBooking.kennelName || currentBooking.roomNumber || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--bb-color-text-muted)' }}>Check-In</span>
                    <span className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                      {safeFormatDate(currentBooking.checkIn)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--bb-color-text-muted)' }}>Check-Out</span>
                    <span className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                      {safeFormatDate(currentBooking.checkOut)}
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {/* Owners */}
            <AssociationCard
              title="Owners"
              type="owner"
              count={owners.length}
              showAdd={false}
              emptyMessage="No owners linked"
            >
              {owners.map((owner, index) => (
                <AssociationItem
                  key={owner.recordId || owner.id || index}
                  type="owner"
                  name={owner.name || `${owner.firstName || ''} ${owner.lastName || ''}`.trim()}
                  subtitle={index === 0 ? 'Primary Owner' : (owner.email || owner.phone)}
                  href={`/customers/${owner.recordId || owner.id}`}
                />
              ))}
            </AssociationCard>

            {/* Bookings */}
            <AssociationCard
              title="Bookings"
              type="booking"
              count={petBookings.length}
              onAdd={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { petId, ownerId: primaryOwner?.recordId })}
              onViewAll={() => setActiveTab('bookings')}
              emptyMessage="No bookings yet"
            >
              {upcomingBookings.slice(0, 3).map(booking => (
                <AssociationItem
                  key={booking.recordId}
                  type="booking"
                  name={`${safeFormatDate(booking.checkIn, 'MMM d')} - ${safeFormatDate(booking.checkOut, 'MMM d')}`}
                  subtitle={booking.serviceName || booking.serviceType || 'Boarding'}
                  status={booking.status?.replace(/_/g, ' ')}
                  statusVariant={getStatusVariant(booking.status)}
                  href={`/bookings/${booking.recordId}`}
                />
              ))}
            </AssociationCard>

            {/* Quick Actions */}
            <Card className="p-4">
              <h3
                className="text-sm font-semibold uppercase tracking-wide mb-3"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                Quick Actions
              </h3>
              <div className="space-y-2">
                {primaryOwner?.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(`tel:${primaryOwner.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Owner
                  </Button>
                )}
                {primaryOwner?.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(`mailto:${primaryOwner.email}`)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email Owner
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { petId, ownerId: primaryOwner?.recordId })}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Book Stay
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => handleAddVaccination('')}
                >
                  <Syringe className="w-4 h-4 mr-2" />
                  Add Vaccination
                </Button>
              </div>
            </Card>
          </aside>
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

      <RenewVaccinationModal
        open={renewModalOpen}
        onClose={handleRenewCancel}
        onSubmit={handleRenewSubmit}
        vaccination={vaccinationToRenew}
        petName={pet?.name}
        isLoading={isRenewing}
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
                : vaccinationsSummary.status === 'none'
                ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                : vaccinationsSummary.status === 'due-soon'
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                : vaccinationsSummary.status === 'incomplete'
                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            <Syringe className="w-3.5 h-3.5 inline mr-1.5" />
            Vaccinations: {vaccinationsSummary.status === 'up-to-date' ? 'Up to date' :
                          vaccinationsSummary.status === 'none' ? 'Not on file' :
                          vaccinationsSummary.status === 'due-soon' ? 'Due soon' :
                          vaccinationsSummary.status === 'incomplete' ? 'Incomplete' : 'Overdue'}
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
              (() => {
                const flags = Array.isArray(pet.behaviorFlags) ? pet.behaviorFlags : [];
                const cautionFlags = ['Aggressive', 'Reactive', 'Anxious'];
                const hasCaution = flags.some(f => cautionFlags.includes(f));
                return hasCaution
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
              })()
            )}
          >
            <Shield className="w-3.5 h-3.5 inline mr-1.5" />
            Behavior: {(() => {
              const flags = Array.isArray(pet.behaviorFlags) ? pet.behaviorFlags : [];
              const cautionFlags = ['Aggressive', 'Reactive', 'Anxious'];
              return flags.some(f => cautionFlags.includes(f)) ? 'Needs caution' : 'Normal';
            })()}
          </button>
        </div>

        {/* Missing Required Vaccines Notice */}
        {vaccinationsSummary.missingRequired?.length > 0 && (
          <div
            className="mt-3 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--bb-color-bg-muted)',
              color: 'var(--bb-color-text-muted)'
            }}
          >
            <span className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Required vaccines not on file:
            </span>{' '}
            {vaccinationsSummary.missingRequired.map(v => v.label || v.name).join(', ')}
          </div>
        )}
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
  handleRenewClick,
  onEdit,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const defaultVaccines = getDefaultVaccines(pet.species);

  // Separate active and archived vaccinations
  const activeVaccinations = useMemo(() => {
    return vaccinations.filter(v => v.status !== 'archived' && !v.isArchived);
  }, [vaccinations]);

  const archivedVaccinations = useMemo(() => {
    return vaccinations.filter(v => v.status === 'archived' || v.isArchived)
      .sort((a, b) => new Date(b.administeredAt) - new Date(a.administeredAt));
  }, [vaccinations]);

  // Get active vaccination for a vaccine type (exclude archived)
  const getActiveVaccinationForType = (type) => {
    const typeName = typeof type === 'object' ? type.name : type;
    const normalizedType = typeName?.toLowerCase()?.trim();

    // Normalize common variations
    const normalize = (t) => {
      const n = t?.toLowerCase()?.trim();
      if (n === 'dhpp' || n === 'dapp/dhpp') return 'dapp';
      if (n === 'fvr' || n === 'fvr/c') return 'fvrcp';
      return n;
    };

    const matchingVaccinations = activeVaccinations.filter(
      v => normalize(v.type) === normalize(normalizedType)
    );
    return matchingVaccinations.sort((a, b) => new Date(b.administeredAt) - new Date(a.administeredAt))[0];
  };

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
            {defaultVaccines.map((vaccine) => {
              const vaccination = getActiveVaccinationForType(vaccine.name);
              const status = getVaccinationStatus(vaccination);
              const { label, intent } = getStatusDisplay(status);
              const displayName = vaccine.label || vaccine.name;

              // Determine if this vaccine needs renewal (expired or expiring soon)
              const needsRenewal = vaccination && (status === 'expired' || status === 'expiring');

              return (
                <div
                  key={vaccine.name}
                  className="flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-[color:var(--bb-color-bg-elevated)]"
                  style={{ borderColor: 'var(--bb-color-border-subtle)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        status === 'expired' && "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                        status === 'expiring' && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                        status !== 'expired' && status !== 'expiring' && "bg-[color:var(--bb-color-info-soft)] text-[color:var(--bb-color-info)]"
                      )}
                    >
                      <Syringe className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {displayName}
                        {vaccine.required && (
                          <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bb-color-bg-muted)', color: 'var(--bb-color-text-muted)' }}>
                            Required
                          </span>
                        )}
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
                        {/* Renew button - shown for active vaccinations, highlighted if expired/expiring */}
                        <Button
                          size="sm"
                          variant={needsRenewal ? 'primary' : 'ghost'}
                          onClick={() => handleRenewClick(vaccination)}
                          className={cn(needsRenewal && 'gap-1')}
                        >
                          <RefreshCw className="w-4 h-4" />
                          {needsRenewal && <span>Renew</span>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditVaccination(vaccination)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteClick(vaccination)}>
                          Delete
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleAddVaccination(vaccine.name)}>
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

      {/* Vaccination History Section */}
      {archivedVaccinations.length > 0 && (
        <section>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 mb-4 text-sm font-medium transition-colors hover:text-[color:var(--bb-color-accent)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", showHistory && "rotate-180")} />
            <Archive className="w-4 h-4" />
            Vaccination History ({archivedVaccinations.length} archived records)
          </button>

          {showHistory && (
            <div className="space-y-2 pl-6 border-l-2" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              {archivedVaccinations.map((vaccination) => (
                <div
                  key={vaccination.recordId}
                  className="flex items-center justify-between p-3 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bb-color-bg-muted)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ backgroundColor: 'var(--bb-color-bg-elevated)', color: 'var(--bb-color-text-muted)' }}
                    >
                      <Syringe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                        {vaccination.type}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                        Administered: {safeFormatDate(vaccination.administeredAt)} •
                        Expired: {safeFormatDate(vaccination.expiresAt)}
                        {vaccination.provider && ` • ${vaccination.provider}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">
                    <Archive className="w-3 h-3 mr-1" />
                    Archived
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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

function DocumentsTab({ pet, onUpdatePet }) {
  const [isUploading, setIsUploading] = useState(false);

  // Use pet.documents from backend as the sole source of truth
  const documents = pet.documents || [];

  const handleUploadClick = () => {
    // Create and trigger a file input
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif';
    input.onchange = (e) => handleFileSelect(e.target.files);
    input.click();
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;

    const { uploadFile } = await import('@/lib/apiClient');
    const fileArray = Array.from(files);
    
    setIsUploading(true);
    const newDocs = [];

    try {
      for (const file of fileArray) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        const { key, publicUrl } = await uploadFile({
          file,
          category: `pet-documents/${pet.recordId}`,
        });

        const doc = {
          name: file.name,
          type: file.type.split('/')[1]?.toUpperCase() || 'FILE',
          url: publicUrl || key,
          key,
          uploadedAt: new Date().toISOString(),
        };

        newDocs.push(doc);
      }

      if (newDocs.length > 0) {
        // Persist documents to the pet record in the database
        // The mutation will invalidate the pet query, refreshing pet.documents
        await onUpdatePet({
          documents: [...documents, ...newDocs],
        });
        toast.success(`${newDocs.length} document${newDocs.length > 1 ? 's' : ''} uploaded successfully`);
      }
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getSignedUrl = async (key, forceDownload = false) => {
    const { default: apiClient } = await import('@/lib/apiClient');
    const params = { key };
    if (forceDownload) params.forceDownload = 'true';
    const { data } = await apiClient.get('/api/v1/download-url', { params });
    return data?.downloadUrl;
  };

  // Open file in new tab for viewing (PDFs, images, text files)
  const handleOpenExternal = async (doc) => {
    try {
      if (doc.url && doc.url.startsWith('http')) {
        window.open(doc.url, '_blank');
      } else if (doc.key) {
        const viewUrl = await getSignedUrl(doc.key, false);
        if (viewUrl) {
          window.open(viewUrl, '_blank');
        } else {
          toast.error('Could not generate view link');
        }
      }
    } catch (err) {
      console.error('Error getting view URL:', err);
      toast.error('View link not available');
    }
  };

  // Force download the file
  const handleDownload = async (doc) => {
    try {
      if (doc.key) {
        const downloadUrl = await getSignedUrl(doc.key, true);
        if (downloadUrl) {
          // Create a temporary link to trigger download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = doc.name || 'document';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          toast.error('Could not generate download link');
        }
      } else if (doc.url && doc.url.startsWith('http')) {
        window.open(doc.url, '_blank');
      }
    } catch (err) {
      console.error('Error downloading file:', err);
      toast.error('Download failed');
    }
  };

  const handleDeleteDocument = async (docToDelete) => {
    try {
      const updatedDocs = documents.filter(d => d.key !== docToDelete.key);
      await onUpdatePet({ documents: updatedDocs });
      toast.success('Document removed');
    } catch (error) {
      console.error('Failed to remove document:', error);
      toast.error('Failed to remove document');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Documents
        </h3>
        <Button size="sm" onClick={handleUploadClick} disabled={isUploading}>
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-1" />
              Upload Document
            </>
          )}
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
          <Button variant="outline" size="sm" className="mt-4" onClick={handleUploadClick} disabled={isUploading}>
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-1" />
                Upload First Document
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc, idx) => (
            <div
              key={doc.key || idx}
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
                    {doc.type} • Uploaded {safeFormatDate(doc.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.url && (
                  <Button size="sm" variant="ghost" onClick={() => handleOpenExternal(doc)} title="Open in new tab">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleDownload(doc)} title="Download">
                  <Download className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleDeleteDocument(doc)} 
                  title="Remove"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
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
