/**
 * Owner Detail Page - 3-Column Enterprise Layout
 * Left: Property cards (About, Address, Emergency, Preferences)
 * Middle: Stats + Tabs (Overview, Activity, Bookings, Billing)
 * Right: Associations (Pets, Bookings, Invoices, Segments)
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useOwnerParams } from '@/lib/useRecordParams';
import {
  Users as UsersIcon,
  Mail,
  Edit,
  Trash2,
  Calendar,
  FileText,
  Phone,
  PawPrint,
  DollarSign,
  Plus,
  X,
  Eye,
  Ban,
  CheckCircle,
  LogIn,
  LogOut,
  RefreshCw,
  MoreHorizontal,
  Receipt,
  ChevronRight,
  ArrowLeft,
  MapPin,
  AlertCircle,
  Clock,
  CreditCard,
  Tag,
  MessageSquare,
  Activity,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import AssociationModal from '@/components/ui/AssociationModal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PropertyCard, PropertyList } from '@/components/ui/PropertyCard';
import { AssociationCard, AssociationItem } from '@/components/ui/AssociationCard';
import { EditablePropertyList, EditablePropertyProvider } from '@/components/ui/EditableProperty';
import { StatusPill } from '@/components/primitives';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useOwnerQuery, useOwnerPetsQuery, useDeleteOwnerMutation, useUpdateOwnerMutation, useAddPetToOwnerMutation, useRemovePetFromOwnerMutation } from '../api';
import { usePetsQuery, useCreatePetMutation } from '@/features/pets/api';
import { useBookingCheckInMutation, useBookingCheckOutMutation, useUpdateBookingMutation } from '@/features/bookings/api';
import { useCreateInvoiceMutation, useSendInvoiceEmailMutation } from '@/features/invoices/api';
import { useAssociationsForObjectPairQuery } from '@/features/settings/api/associations';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';
import { cn, formatCurrency } from '@/lib/utils';

// Helper to safely format dates
const safeFormatDate = (dateStr, formatStr = 'MMM d, yyyy') => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return format(date, formatStr);
  } catch {
    return null;
  }
};

const safeFormatDistance = (dateStr) => {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return null;
  }
};

const OwnerDetail = () => {
  // Extract ownerId from either old (/owners/:ownerId) or new (/owners/:accountCode/record/:typeCode/:recordId) URL pattern
  const { id: ownerId } = useOwnerParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((state) => state.tenant?.recordId ?? 'unknown');

  const [addPetModalOpen, setAddPetModalOpen] = useState(false);
  const [deleteOwnerDialogOpen, setDeleteOwnerDialogOpen] = useState(false);
  const [isDeletingOwner, setIsDeletingOwner] = useState(false);
  const [removePetDialogOpen, setRemovePetDialogOpen] = useState(false);
  const [petToRemove, setPetToRemove] = useState(null);
  const [isRemovingPet, setIsRemovingPet] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const ownerQuery = useOwnerQuery(ownerId);
  const petsQuery = usePetsQuery();
  const ownerPetsQuery = useOwnerPetsQuery(ownerId);
  const deleteOwnerMutation = useDeleteOwnerMutation();
  const updateOwnerMutation = useUpdateOwnerMutation(ownerId);
  const addPetMutation = useAddPetToOwnerMutation(ownerId);
  const removePetMutation = useRemovePetFromOwnerMutation(ownerId);
  const createPetMutation = useCreatePetMutation();
  const { openSlideout } = useSlideout();

  // Fetch association labels for owner-to-pet associations
  const associationsQuery = useAssociationsForObjectPairQuery('owner', 'pet');

  const owner = ownerQuery.data;
  const allPets = petsQuery.data?.pets ?? [];

  // Transform association definitions to the format expected by AssociationModal
  const associationLabels = [
    { value: '', label: 'No label' },
    ...(associationsQuery.data || []).map(assoc => ({
      value: assoc.recordId,
      label: assoc.label,
    })),
  ];

  const handleEdit = () => {
    toast.info('Edit functionality coming soon');
  };

  // Handler for inline property edits
  const handlePropertySave = async (fieldKey, value) => {
    try {
      // Handle nested address fields
      if (fieldKey.startsWith('address.')) {
        const addressKey = fieldKey.split('.')[1];
        await updateOwnerMutation.mutateAsync({
          address: { ...(owner.address || {}), [addressKey]: value }
        });
      } else {
        await updateOwnerMutation.mutateAsync({ [fieldKey]: value });
      }
      toast.success('Updated successfully');
    } catch (err) {
      toast.error('Failed to update');
      throw err;
    }
  };

  const handleDelete = () => {
    setDeleteOwnerDialogOpen(true);
  };

  const handleConfirmOwnerDelete = async () => {
    setIsDeletingOwner(true);
    try {
      await deleteOwnerMutation.mutateAsync(ownerId);
      queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantId) });
      toast.success('Owner deleted successfully');
      navigate('/owners');
    } catch (error) {
      toast.error(error?.message || 'Failed to delete owner');
    } finally {
      setIsDeletingOwner(false);
      setDeleteOwnerDialogOpen(false);
    }
  };

  const handleAssociatePet = async (associations) => {
    try {
      for (const { recordId, label } of associations) {
        const associationDef = associationsQuery.data?.find(a => a.recordId === label);
        const isPrimary = associationDef?.label === 'Primary';
        await addPetMutation.mutateAsync({ petId: recordId, isPrimary });
      }
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantId), ownerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantId) });

      const count = associations.length;
      toast.success(`${count} pet${count > 1 ? 's' : ''} associated successfully`);
    } catch (error) {
      toast.error(error?.message || 'Failed to associate pet(s)');
    }
  };

  const handleCreatePet = async () => {
    try {
      const petName = document.getElementById('petName')?.value;
      const petBreed = document.getElementById('petBreed')?.value;

      if (!petName) {
        toast.error('Pet name is required');
        return;
      }

      const petData = {
        name: petName,
        ownerIds: [],
        behaviorFlags: [],
      };

      if (petBreed) petData.breed = petBreed;

      const newPet = await createPetMutation.mutateAsync(petData);
      await addPetMutation.mutateAsync({ petId: newPet.recordId, isPrimary: false });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantId), ownerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantId) });
      toast.success('Pet created and associated successfully');
      setAddPetModalOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to create pet');
    }
  };

  const handleRemovePet = (pet) => {
    setPetToRemove(pet);
    setRemovePetDialogOpen(true);
  };

  const handleConfirmRemovePet = async () => {
    if (!petToRemove) return;

    setIsRemovingPet(true);
    try {
      await removePetMutation.mutateAsync(petToRemove.recordId);
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantId), ownerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantId) });
      toast.success('Pet removed successfully');
      setRemovePetDialogOpen(false);
      setPetToRemove(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to remove pet');
    } finally {
      setIsRemovingPet(false);
    }
  };

  // Loading state
  if (ownerQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="animate-pulse" style={{ color: 'var(--bb-color-text-muted)' }}>
          Loading owner details...
        </div>
      </div>
    );
  }

  // Not found state
  if (!owner) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <UsersIcon className="w-16 h-16 mb-4" style={{ color: 'var(--bb-color-text-muted)' }} />
        <h2 className="text-xl font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Owner not found
        </h2>
        <p className="mt-2" style={{ color: 'var(--bb-color-text-muted)' }}>
          This owner may have been deleted or you don't have access.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => navigate('/owners')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Owners
        </Button>
      </div>
    );
  }

  const fullName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner';

  // Get pets from dedicated owner-pets query, or fallback to owner.pets, or filter allPets
  const ownerPetsFromQuery = ownerPetsQuery.data || [];
  const ownerPetsFromOwner = owner.pets?.filter(pet => pet && pet.recordId) || [];
  const petsFromList = allPets.filter(pet =>
    pet.ownerIds?.includes(ownerId) ||
    pet.owners?.some(o => o.recordId === ownerId || o.id === ownerId) ||
    pet.ownerId === ownerId
  );
  // Priority: dedicated query > owner.pets > filtered allPets
  const pets = ownerPetsFromQuery.length > 0 ? ownerPetsFromQuery
    : ownerPetsFromOwner.length > 0 ? ownerPetsFromOwner
    : petsFromList;

  const bookings = owner.bookings || [];
  const payments = owner.payments || [];
  const invoices = owner.invoices || [];
  const lifetimeValue = payments.reduce((sum, p) => sum + (p.amountCents || 0), 0);

  // Build address parts
  const addressParts = [];
  if (owner.address?.street) addressParts.push(owner.address.street);
  if (owner.address?.city) addressParts.push(owner.address.city);
  if (owner.address?.state) addressParts.push(owner.address.state);
  if (owner.address?.zip) addressParts.push(owner.address.zip);
  const hasAddress = addressParts.length > 0;

  // Status badge
  const ownerStatus = bookings.length > 0 ? 'Active Client' : 'New Client';
  const ownerStatusVariant = bookings.length > 0 ? 'success' : 'neutral';

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
            <Link
              to="/owners"
              className="flex items-center gap-1 hover:text-[color:var(--bb-color-text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Customers
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span style={{ color: 'var(--bb-color-text-primary)' }}>{fullName}</span>
          </nav>

          {/* Title Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="text-2xl font-semibold truncate"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {fullName}
                </h1>
                <Badge variant={ownerStatusVariant}>
                  {ownerStatus}
                </Badge>
              </div>
              <p className="mt-1 text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                {owner.email || 'No email on file'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="primary" onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}>
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

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Property Cards */}
          <EditablePropertyProvider>
          <aside
            className="w-64 flex-shrink-0 border-r overflow-y-auto p-4 space-y-4"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {/* About this Owner */}
            <PropertyCard title="About" icon={UsersIcon} storageKey={`owner_${ownerId}_about`}>
              <EditablePropertyList
                properties={[
                  { label: 'First Name', value: owner.firstName, fieldKey: 'firstName', type: 'text' },
                  { label: 'Last Name', value: owner.lastName, fieldKey: 'lastName', type: 'text' },
                  { label: 'Email', value: owner.email, fieldKey: 'email', type: 'email' },
                  { label: 'Phone', value: owner.phone, fieldKey: 'phone', type: 'phone' },
                ]}
                onSave={handlePropertySave}
              />
              {/* Status and Created are read-only */}
              <div className="mt-4 space-y-3">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>Status</dt>
                  <dd><Badge variant={ownerStatusVariant}>{ownerStatus}</Badge></dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>Created</dt>
                  <dd className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>{safeFormatDate(owner.createdAt) || '—'}</dd>
                </div>
              </div>
            </PropertyCard>

            {/* Address */}
            <PropertyCard title="Address" icon={MapPin} storageKey={`owner_${ownerId}_address`} defaultOpen={hasAddress}>
              <EditablePropertyList
                properties={[
                  { label: 'Street', value: owner.address?.street, fieldKey: 'address.street', type: 'text' },
                  { label: 'City', value: owner.address?.city, fieldKey: 'address.city', type: 'text' },
                  { label: 'State', value: owner.address?.state, fieldKey: 'address.state', type: 'text' },
                  { label: 'ZIP Code', value: owner.address?.zip, fieldKey: 'address.zip', type: 'text' },
                  { label: 'Country', value: owner.address?.country, fieldKey: 'address.country', type: 'text' },
                ]}
                onSave={handlePropertySave}
              />
            </PropertyCard>

            {/* Emergency Contact */}
            <PropertyCard
              title="Emergency Contact"
              icon={AlertCircle}
              storageKey={`owner_${ownerId}_emergency`}
              defaultOpen={!!(owner.emergencyContactName || owner.emergencyContactPhone)}
            >
              <EditablePropertyList
                properties={[
                  { label: 'Contact Name', value: owner.emergencyContactName, fieldKey: 'emergencyContactName', type: 'text' },
                  { label: 'Contact Phone', value: owner.emergencyContactPhone, fieldKey: 'emergencyContactPhone', type: 'phone' },
                ]}
                onSave={handlePropertySave}
              />
            </PropertyCard>

            {/* Preferences */}
            <PropertyCard title="Preferences" icon={MessageSquare} storageKey={`owner_${ownerId}_preferences`} defaultOpen={!!owner.notes}>
              <EditablePropertyList
                properties={[
                  { label: 'Contact Method', value: owner.preferredContactMethod, fieldKey: 'preferredContactMethod', type: 'single-select', options: ['Email', 'Phone', 'Text', 'No Preference'] },
                  { label: 'Notes', value: owner.notes, fieldKey: 'notes', type: 'textarea' },
                ]}
                onSave={handlePropertySave}
              />
            </PropertyCard>

            {/* Account - Read-only computed fields */}
            <PropertyCard title="Account" icon={CreditCard} storageKey={`owner_${ownerId}_account`}>
              <PropertyList
                properties={[
                  { label: 'Lifetime Value', value: lifetimeValue, type: 'currency' },
                  { label: 'Total Bookings', value: bookings.length },
                  { label: 'Payment on File', value: owner.hasPaymentMethod ? 'Yes' : 'No' },
                ]}
              />
            </PropertyCard>
          </aside>
          </EditablePropertyProvider>

          {/* Middle - Stats + Tabs */}
          <main className="flex-1 overflow-y-auto">
            {/* Stats Bar */}
            <div className="px-6 py-4 border-b grid grid-cols-4 gap-4" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <StatItem label="Total Bookings" value={bookings.length} />
              <StatItem label="Lifetime Value" value={formatCurrency(lifetimeValue)} />
              <StatItem label="Active Pets" value={pets.length} />
              <StatItem
                label="Last Activity"
                value={safeFormatDistance(bookings[0]?.checkIn) || 'Never'}
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="border-b px-6" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <TabsList className="h-12 bg-transparent">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="bookings" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Bookings
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Billing
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="overview" className="mt-0">
                  <OverviewTab owner={owner} bookings={bookings} pets={pets} lifetimeValue={lifetimeValue} />
                </TabsContent>

                <TabsContent value="activity" className="mt-0">
                  <ActivityTab owner={owner} bookings={bookings} />
                </TabsContent>

                <TabsContent value="bookings" className="mt-0">
                  <BookingsTab bookings={bookings} ownerId={ownerId} navigate={navigate} openSlideout={openSlideout} onRefresh={() => ownerQuery.refetch()} />
                </TabsContent>

                <TabsContent value="billing" className="mt-0">
                  <BillingTab payments={payments} invoices={invoices} ownerId={ownerId} navigate={navigate} onRefresh={() => ownerQuery.refetch()} />
                </TabsContent>
              </div>
            </Tabs>
          </main>

          {/* Right Sidebar - Associations */}
          <aside
            className="w-72 flex-shrink-0 border-l overflow-y-auto p-4 space-y-4"
            style={{ borderColor: 'var(--bb-color-border-subtle)' }}
          >
            {/* Pets */}
            <AssociationCard
              title="Pets"
              type="pet"
              count={pets.length}
              onAdd={() => setAddPetModalOpen(true)}
              emptyMessage="No pets yet"
            >
              {pets.slice(0, 5).map((pet) => (
                <AssociationItem
                  key={pet.recordId}
                  name={pet.name}
                  subtitle={pet.breed || pet.species || 'Pet'}
                  href={`/pets/${pet.recordId}`}
                  type="pet"
                  avatar={pet.profileImage}
                />
              ))}
            </AssociationCard>

            {/* Bookings */}
            <AssociationCard
              title="Bookings"
              type="booking"
              count={bookings.length}
              onAdd={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}
              viewAllLink={`/bookings?ownerId=${ownerId}`}
              emptyMessage="No bookings yet"
            >
              {bookings.slice(0, 5).map((booking) => (
                <AssociationItem
                  key={booking.recordId}
                  name={`${safeFormatDate(booking.checkIn, 'MMM d')} - ${safeFormatDate(booking.checkOut, 'MMM d')}`}
                  subtitle={booking.pet?.name || 'Booking'}
                  href={`/bookings/${booking.recordId}`}
                  type="booking"
                  status={booking.status?.replace(/_/g, ' ')}
                  statusVariant={getStatusVariant(booking.status)}
                />
              ))}
            </AssociationCard>

            {/* Invoices */}
            <AssociationCard
              title="Invoices"
              type="invoice"
              count={invoices?.length || 0}
              onAdd={() => navigate(`/invoices?action=new&ownerId=${ownerId}`)}
              viewAllLink={`/invoices?ownerId=${ownerId}`}
              showAdd={true}
              emptyMessage="No invoices yet"
            >
              {(invoices || []).slice(0, 3).map((invoice) => (
                <AssociationItem
                  key={invoice.recordId}
                  name={`Invoice #${invoice.invoiceNumber || invoice.recordId?.slice(0, 8)}`}
                  subtitle={formatCurrency(invoice.totalCents || 0)}
                  href={`/invoices/${invoice.recordId}`}
                  type="invoice"
                  status={invoice.status}
                  statusVariant={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'danger' : 'warning'}
                />
              ))}
            </AssociationCard>

            {/* Segments */}
            <AssociationCard
              title="Segments"
              type="segment"
              count={owner.segments?.length || 0}
              showAdd={false}
              emptyMessage="No segments"
            >
              {(owner.segments || []).map((segment) => (
                <AssociationItem
                  key={segment.id || segment.name}
                  name={segment.name || segment}
                  type="segment"
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
                {owner.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(`tel:${owner.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                )}
                {owner.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(`mailto:${owner.email}`)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  New Booking
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setAddPetModalOpen(true)}
                >
                  <PawPrint className="w-4 h-4 mr-2" />
                  Add Pet
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      {/* Modals */}
      <AssociationModal
        open={addPetModalOpen}
        onClose={() => setAddPetModalOpen(false)}
        title="Associate Pet"
        objectType="pet"
        availableRecords={allPets}
        currentAssociations={pets.map(p => p.recordId)}
        onAssociate={handleAssociatePet}
        onCreateNew={handleCreatePet}
        associationLabels={associationLabels}
        formatRecordDisplay={(pet) => `${pet.name}${pet.breed ? ` (${pet.breed})` : ''}`}
        isLoading={addPetMutation.isPending || createPetMutation.isPending || petsQuery.isLoading}
        createForm={
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              Create a new pet and automatically associate it with {fullName}.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--bb-color-text-primary)' }}>
                Pet Name <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="text"
                id="petName"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                style={{
                  borderColor: 'var(--bb-color-border-subtle)',
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  color: 'var(--bb-color-text-primary)',
                }}
                placeholder="Enter pet name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--bb-color-text-primary)' }}>
                Breed
              </label>
              <input
                type="text"
                id="petBreed"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                style={{
                  borderColor: 'var(--bb-color-border-subtle)',
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  color: 'var(--bb-color-text-primary)',
                }}
                placeholder="Enter breed (optional)"
              />
            </div>
          </div>
        }
      />

      <ConfirmDialog
        isOpen={deleteOwnerDialogOpen}
        onClose={() => setDeleteOwnerDialogOpen(false)}
        onConfirm={handleConfirmOwnerDelete}
        title="Delete Owner"
        message={`Are you sure you want to delete ${fullName}? This will permanently remove all associated records including pets, bookings, and payment history. This action cannot be undone.`}
        confirmText="Delete Owner"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingOwner}
      />

      <ConfirmDialog
        isOpen={removePetDialogOpen}
        onClose={() => {
          setRemovePetDialogOpen(false);
          setPetToRemove(null);
        }}
        onConfirm={handleConfirmRemovePet}
        title="Remove Pet"
        message={`Are you sure you want to remove ${petToRemove?.name} from ${fullName}? This will unlink the pet from this owner.`}
        confirmText="Remove Pet"
        cancelText="Cancel"
        variant="warning"
        isLoading={isRemovingPet}
      />
    </>
  );
};

// Helper Components

function StatItem({ label, value }) {
  return (
    <div>
      <p
        className="text-xs font-medium uppercase tracking-wide mb-0.5"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        {label}
      </p>
      <p
        className="text-lg font-semibold"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {value}
      </p>
    </div>
  );
}

function getStatusVariant(status) {
  const statusMap = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    CHECKED_IN: 'success',
    CHECKED_OUT: 'neutral',
    CANCELLED: 'danger',
    COMPLETED: 'success',
  };
  return statusMap[status?.toUpperCase()] || 'neutral';
}

// Tab Components

function OverviewTab({ owner, bookings, pets, lifetimeValue }) {
  const recentActivity = bookings.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Recent Activity */}
      <section>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No activity yet
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((booking) => (
              <div
                key={booking.recordId}
                className="flex items-center gap-4 p-3 rounded-lg border"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'var(--bb-color-info-soft)',
                    color: 'var(--bb-color-info)',
                  }}
                >
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    Booking {booking.pet?.name ? `for ${booking.pet.name}` : `#${booking.recordId?.slice(0, 8)}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {safeFormatDate(booking.checkIn)} - {safeFormatDate(booking.checkOut)}
                  </p>
                </div>
                <StatusPill status={booking.status} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Account Created Info */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
              Customer Since
            </p>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
              {safeFormatDate(owner.createdAt) || 'Unknown'}
            </p>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
              Last Updated
            </p>
            <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
              {safeFormatDate(owner.updatedAt) || 'Unknown'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActivityTab({ owner, bookings }) {
  // Combine various activities into a timeline
  const activities = useMemo(() => {
    const items = [];

    // Add bookings as activities
    bookings.forEach((booking) => {
      items.push({
        id: `booking_${booking.recordId}`,
        type: 'booking',
        title: `Booking ${booking.status === 'CHECKED_IN' ? 'checked in' : booking.status === 'CHECKED_OUT' ? 'completed' : 'created'}`,
        description: booking.pet?.name ? `${booking.pet.name} - ${safeFormatDate(booking.checkIn)} to ${safeFormatDate(booking.checkOut)}` : `${safeFormatDate(booking.checkIn)} to ${safeFormatDate(booking.checkOut)}`,
        timestamp: booking.updatedAt || booking.createdAt,
        icon: Calendar,
      });
    });

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return items;
  }, [bookings]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          Activity Timeline
        </h3>
        <Button variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Log Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12 rounded-lg border-2 border-dashed" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--bb-color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No activity recorded yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--bb-color-bg-elevated)',
                    color: 'var(--bb-color-text-muted)',
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {activity.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--bb-color-text-muted)' }}>
                  {safeFormatDistance(activity.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingsTab({ bookings, ownerId, navigate, openSlideout, onRefresh }) {
  const checkInMutation = useBookingCheckInMutation();
  const checkOutMutation = useBookingCheckOutMutation();
  const [actionDropdownOpen, setActionDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActionDropdownOpen(null);
      }
    };
    if (actionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionDropdownOpen]);

  const handleAction = async (action, booking) => {
    const bookingId = booking.recordId || booking.id;
    setActionDropdownOpen(null);

    switch (action) {
      case 'view':
        navigate(`/bookings/${bookingId}`);
        break;
      case 'edit':
        navigate(`/bookings/${bookingId}?edit=true`);
        break;
      case 'checkIn':
        try {
          await checkInMutation.mutateAsync({ bookingId });
          toast.success('Checked in successfully');
          onRefresh?.();
        } catch (error) {
          toast.error(error?.message || 'Failed to check in');
        }
        break;
      case 'checkOut':
        try {
          await checkOutMutation.mutateAsync({ bookingId });
          toast.success('Checked out successfully');
          onRefresh?.();
        } catch (error) {
          toast.error(error?.message || 'Failed to check out');
        }
        break;
      case 'cancel':
        navigate(`/bookings/${bookingId}?action=cancel`);
        break;
      case 'rebook':
        navigate(`/bookings?action=new&cloneFrom=${bookingId}&ownerId=${ownerId}`);
        break;
      default:
        break;
    }
  };

  const getActionsForStatus = (status) => {
    const normalizedStatus = (status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'pending':
      case 'confirmed':
        return [
          { action: 'view', label: 'View Details', icon: Eye },
          { action: 'edit', label: 'Edit Booking', icon: Edit },
          { action: 'checkIn', label: 'Check In', icon: LogIn },
          { action: 'cancel', label: 'Cancel', icon: Ban },
        ];
      case 'checked_in':
      case 'active':
        return [
          { action: 'view', label: 'View Details', icon: Eye },
          { action: 'checkOut', label: 'Check Out', icon: LogOut },
        ];
      case 'checked_out':
      case 'completed':
        return [
          { action: 'view', label: 'View Details', icon: Eye },
          { action: 'rebook', label: 'Rebook', icon: RefreshCw },
        ];
      case 'cancelled':
        return [
          { action: 'view', label: 'View Details', icon: Eye },
          { action: 'rebook', label: 'Rebook', icon: RefreshCw },
        ];
      default:
        return [{ action: 'view', label: 'View Details', icon: Eye }];
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
          All Bookings ({bookings.length})
        </h3>
        <Button size="sm" onClick={() => openSlideout(SLIDEOUT_TYPES.BOOKING_CREATE, { ownerId })}>
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 rounded-lg border-2 border-dashed" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--bb-color-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            No bookings yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const bookingId = booking.recordId || booking.id;
            const actions = getActionsForStatus(booking.status);
            const isDropdownOpen = actionDropdownOpen === bookingId;

            return (
              <div
                key={bookingId}
                className="group flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-sm"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/bookings/${bookingId}`)}
                >
                  <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    Booking #{bookingId?.slice(0, 8)}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {safeFormatDate(booking.checkIn)} - {safeFormatDate(booking.checkOut)}
                  </p>
                  {booking.pet?.name && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                      <PawPrint className="h-3 w-3" />
                      {booking.pet.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={booking.status} />
                  <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionDropdownOpen(isDropdownOpen ? null : bookingId);
                      }}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--bb-color-bg-elevated)]"
                      style={{ color: 'var(--bb-color-text-muted)' }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {isDropdownOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border shadow-lg py-1"
                        style={{
                          backgroundColor: 'var(--bb-color-bg-surface)',
                          borderColor: 'var(--bb-color-border-subtle)',
                        }}
                      >
                        {actions.map((item) => {
                          const ActionIcon = item.icon;
                          return (
                            <button
                              key={item.action}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAction(item.action, booking);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bb-color-bg-elevated)]"
                              style={{ color: 'var(--bb-color-text-primary)' }}
                            >
                              <ActionIcon className={cn(
                                'h-4 w-4',
                                item.action === 'checkIn' && 'text-green-600',
                                item.action === 'checkOut' && 'text-amber-600',
                                item.action === 'cancel' && 'text-red-500',
                                item.action === 'rebook' && 'text-blue-500'
                              )} />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BillingTab({ payments, invoices, ownerId, navigate, onRefresh }) {
  const sendInvoiceEmailMutation = useSendInvoiceEmailMutation();

  return (
    <div className="space-y-8">
      {/* Invoices Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
            Invoices ({invoices?.length || 0})
          </h3>
          <Button size="sm" onClick={() => navigate(`/invoices?action=new&ownerId=${ownerId}`)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        {(!invoices || invoices.length === 0) ? (
          <div className="text-center py-8 rounded-lg border-2 border-dashed" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <FileText className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--bb-color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              No invoices yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.recordId}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                    Invoice #{invoice.invoiceNumber || invoice.recordId?.slice(0, 8)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {safeFormatDate(invoice.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {formatCurrency(invoice.totalCents || 0)}
                  </span>
                  <StatusPill status={invoice.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payments Section */}
      <section>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--bb-color-text-primary)' }}>
          Payment History ({payments.length})
        </h3>

        {payments.length === 0 ? (
          <div className="text-center py-8 rounded-lg border-2 border-dashed" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <DollarSign className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--bb-color-text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
              No payments yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.recordId}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--bb-color-text-primary)' }}>
                    {formatCurrency(payment.amountCents || 0)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                    {safeFormatDate(payment.createdAt)}
                  </p>
                </div>
                <StatusPill status={payment.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default OwnerDetail;
