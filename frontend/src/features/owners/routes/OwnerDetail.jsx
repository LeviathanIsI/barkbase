/**
 * Owner Detail Page - Phase 7 Enterprise Layout
 * Two-column layout with strong detail header, clear content zones,
 * and token-based styling consistent with the enterprise design system.
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Send,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import AssociationModal from '@/components/ui/AssociationModal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Card, PageHeader } from '@/components/ui/Card';
import { StatusPill } from '@/components/primitives';
import { useOwnerQuery, useDeleteOwnerMutation, useAddPetToOwnerMutation, useRemovePetFromOwnerMutation } from '../api';
import { usePetsQuery, useCreatePetMutation } from '@/features/pets/api';
import { useBookingCheckInMutation, useBookingCheckOutMutation, useUpdateBookingMutation } from '@/features/bookings/api';
import { useCreateInvoiceMutation, useSendInvoiceEmailMutation } from '@/features/invoices/api';
import { useAssociationsForObjectPairQuery } from '@/features/settings/api/associations';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { cn, formatCurrency } from '@/lib/utils';

const OwnerDetail = () => {
  const { ownerId } = useParams();
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
  const deleteOwnerMutation = useDeleteOwnerMutation();
  const addPetMutation = useAddPetToOwnerMutation(ownerId);
  const removePetMutation = useRemovePetFromOwnerMutation(ownerId);
  const createPetMutation = useCreatePetMutation();

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

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: UsersIcon },
    { id: 'pets', label: 'Pets', icon: PawPrint },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'payments', label: 'Payments', icon: DollarSign },
  ];

  if (ownerQuery.isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        <div className="animate-pulse">Loading owner details...</div>
      </div>
    );
  }

  if (!owner) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        <p>Owner not found</p>
      </div>
    );
  }

  const fullName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Owner';
  const pets = owner.pets?.filter(pet => pet && pet.recordId) || [];
  const bookings = owner.bookings || [];
  const payments = owner.payments || [];
  const lifetimeValue = payments.reduce((sum, p) => sum + (p.amountCents || 0), 0);
  const ownerAddress = owner.address
    ? [owner.address.street, owner.address.city, owner.address.state, owner.address.zip].filter(Boolean).join(', ')
    : null;

  return (
    <>
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        {/* Page Header with strong identity */}
        <PageHeader
          breadcrumb="Home > Clients > Owners"
          title={fullName}
          description={owner.email || 'No email on file'}
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
            {/* Owner Profile Card */}
            <Card className="p-[var(--bb-space-6,1.5rem)]">
              <div className="flex items-start gap-[var(--bb-space-4,1rem)]">
                <div
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'var(--bb-color-purple-soft)',
                    color: 'var(--bb-color-purple)',
                  }}
                >
                  <UsersIcon className="h-8 w-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-[var(--bb-font-size-xl,1.5rem)] font-[var(--bb-font-weight-semibold,600)]"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    {fullName}
                  </h2>
                  {owner.email && (
                    <p
                      className="text-[var(--bb-font-size-sm,0.875rem)] mt-[var(--bb-space-1,0.25rem)]"
                      style={{ color: 'var(--bb-color-text-muted)' }}
                    >
                      {owner.email}
                    </p>
                  )}
                  <div className="flex items-center gap-[var(--bb-space-2,0.5rem)] mt-[var(--bb-space-2,0.5rem)]">
                    <Badge variant={bookings.length > 0 ? 'success' : 'neutral'}>
                      {bookings.length > 0 ? 'Active Client' : 'New Client'}
                    </Badge>
                    <span
                      className="text-[var(--bb-font-size-sm,0.875rem)]"
                      style={{ color: 'var(--bb-color-text-muted)' }}
                    >
                      {pets.length} {pets.length === 1 ? 'pet' : 'pets'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Info Grid */}
              <div className="mt-[var(--bb-space-6,1.5rem)] grid gap-[var(--bb-space-4,1rem)] sm:grid-cols-2">
                <InfoItem label="Email" value={owner.email || '—'} icon={Mail} />
                <InfoItem label="Phone" value={owner.phone || '—'} icon={Phone} />
                {ownerAddress && (
                  <div className="sm:col-span-2">
                    <InfoItem label="Address" value={ownerAddress} />
                  </div>
                )}
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
                {activeTab === 'overview' && (
                  <OverviewTab owner={owner} bookings={bookings} lifetimeValue={lifetimeValue} />
                )}
                {activeTab === 'pets' && (
                  <PetsTab
                    pets={pets}
                    onAddPet={() => setAddPetModalOpen(true)}
                    onRemovePet={handleRemovePet}
                    navigate={navigate}
                  />
                )}
                {activeTab === 'bookings' && <BookingsTab bookings={bookings} ownerId={ownerId} navigate={navigate} onRefresh={() => ownerQuery.refetch()} />}
                {activeTab === 'payments' && <PaymentsTab payments={payments} ownerId={ownerId} navigate={navigate} onRefresh={() => ownerQuery.refetch()} />}
              </div>
            </Card>
          </div>

          {/* Right column: Status + quick actions + secondary info */}
          <div className="lg:col-span-4 space-y-[var(--bb-space-6,1.5rem)]">
            {/* Key Metrics Card */}
            <Card className="p-[var(--bb-space-6,1.5rem)]">
              <h3
                className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-4,1rem)]"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                Account Summary
              </h3>
              <div className="space-y-[var(--bb-space-3,0.75rem)]">
                <MetricItem label="Total Bookings" value={bookings.length} />
                <MetricItem label="Lifetime Value" value={formatCurrency(lifetimeValue)} />
                <MetricItem
                  label="Last Booking"
                  value={
                    bookings[0]
                      ? new Date(bookings[0].checkIn).toLocaleDateString()
                      : 'Never'
                  }
                />
                <MetricItem
                  label="Avg. Booking Value"
                  value={
                    bookings.length > 0
                      ? formatCurrency(lifetimeValue / bookings.length)
                      : '$0.00'
                  }
                />
              </div>
            </Card>

            {/* Pets Card */}
            <Card className="p-[var(--bb-space-6,1.5rem)]">
              <div className="flex items-center justify-between mb-[var(--bb-space-4,1rem)]">
                <h3
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  Pets ({pets.length})
                </h3>
                <Button size="xs" variant="ghost" onClick={() => setAddPetModalOpen(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {pets.length === 0 ? (
                <p
                  className="text-[var(--bb-font-size-sm,0.875rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  No pets yet
                </p>
              ) : (
                <div className="space-y-[var(--bb-space-2,0.5rem)]">
                  {pets.slice(0, 3).map((pet) => (
                    <button
                      key={pet.recordId}
                      onClick={() => navigate(`/pets/${pet.recordId}`)}
                      className="w-full flex items-center gap-[var(--bb-space-3,0.75rem)] p-[var(--bb-space-2,0.5rem)] rounded-lg transition-colors text-left"
                      style={{
                        backgroundColor: 'transparent',
                      }}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{
                          backgroundColor: 'var(--bb-color-accent-soft)',
                          color: 'var(--bb-color-accent)',
                        }}
                      >
                        <PawPrint className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] truncate"
                          style={{ color: 'var(--bb-color-text-primary)' }}
                        >
                          {pet.name}
                        </p>
                        <p
                          className="text-[var(--bb-font-size-xs,0.75rem)] truncate"
                          style={{ color: 'var(--bb-color-text-muted)' }}
                        >
                          {pet.breed || 'Unknown breed'}
                        </p>
                      </div>
                    </button>
                  ))}
                  {pets.length > 3 && (
                    <button
                      onClick={() => setActiveTab('pets')}
                      className="w-full text-[var(--bb-font-size-sm,0.875rem)] py-[var(--bb-space-2,0.5rem)]"
                      style={{ color: 'var(--bb-color-accent)' }}
                    >
                      View all {pets.length} pets →
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* Quick Actions Card */}
            <Card className="p-[var(--bb-space-6,1.5rem)]">
              <h3
                className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-4,1rem)]"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                Quick Actions
              </h3>
              <div className="space-y-[var(--bb-space-2,0.5rem)]">
                {owner.phone && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(`tel:${owner.phone}`)}
                  >
                    <Phone className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
                    Call
                  </Button>
                )}

                {owner.email && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(`mailto:${owner.email}`)}
                  >
                    <Mail className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
                    Email
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/bookings?action=new')}
                >
                  <Calendar className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
                  New Booking
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setAddPetModalOpen(true)}
                >
                  <PawPrint className="w-4 h-4 mr-[var(--bb-space-2,0.5rem)]" />
                  Add Pet
                </Button>
              </div>
            </Card>

            {/* Notes Card */}
            {owner.notes && (
              <Card className="p-[var(--bb-space-6,1.5rem)]">
                <h3
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] uppercase tracking-wide mb-[var(--bb-space-4,1rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  Notes
                </h3>
                <p
                  className="text-[var(--bb-font-size-sm,0.875rem)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {owner.notes}
                </p>
              </Card>
            )}
          </div>
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
          <div className="space-y-[var(--bb-space-4,1rem)]">
            <p
              className="text-[var(--bb-font-size-sm,0.875rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              Create a new pet and automatically associate it with {fullName}.
            </p>
            <div>
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] mb-[var(--bb-space-1,0.25rem)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Pet Name <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="text"
                id="petName"
                className="w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                style={{
                  borderColor: 'var(--bb-color-border-subtle)',
                  backgroundColor: 'var(--bb-color-bg-surface)',
                  color: 'var(--bb-color-text-primary)',
                }}
                placeholder="Enter pet name"
              />
            </div>
            <div>
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] mb-[var(--bb-space-1,0.25rem)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Breed
              </label>
              <input
                type="text"
                id="petBreed"
                className="w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)] text-[var(--bb-font-size-sm,0.875rem)] focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
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

function InfoItem({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-[var(--bb-space-3,0.75rem)]">
      {Icon && (
        <Icon className="h-5 w-5 mt-0.5" style={{ color: 'var(--bb-color-text-muted)' }} />
      )}
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
    </div>
  );
}

function MetricItem({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span
        className="text-[var(--bb-font-size-sm,0.875rem)]"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        {label}
      </span>
      <span
        className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
        style={{ color: 'var(--bb-color-text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}

// TAB COMPONENTS

function OverviewTab({ owner, bookings, lifetimeValue }) {
  const recentActivity = bookings.slice(0, 5);

  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <div>
        <h3
          className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)] mb-[var(--bb-space-4,1rem)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <p
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            No activity yet
          </p>
        ) : (
          <div className="space-y-[var(--bb-space-3,0.75rem)]">
            {recentActivity.map((booking) => (
              <div
                key={booking.recordId}
                className="flex items-center gap-[var(--bb-space-4,1rem)] p-[var(--bb-space-3,0.75rem)] rounded-lg border"
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
                  <p
                    className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    Booking #{booking.id?.slice(0, 8) || booking.recordId?.slice(0, 8)}
                  </p>
                  <p
                    className="text-[var(--bb-font-size-xs,0.75rem)]"
                    style={{ color: 'var(--bb-color-text-muted)' }}
                  >
                    {new Date(booking.checkIn).toLocaleDateString()} – {new Date(booking.checkOut).toLocaleDateString()}
                  </p>
                </div>
                <StatusPill status={booking.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Created Info */}
      <div className="grid gap-[var(--bb-space-4,1rem)] sm:grid-cols-2">
        <div
          className="p-[var(--bb-space-4,1rem)] rounded-lg"
          style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
        >
          <p
            className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide mb-[var(--bb-space-1,0.25rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            Created
          </p>
          <p
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {owner.createdAt ? new Date(owner.createdAt).toLocaleDateString() : '—'}
          </p>
        </div>
        <div
          className="p-[var(--bb-space-4,1rem)] rounded-lg"
          style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}
        >
          <p
            className="text-[var(--bb-font-size-xs,0.75rem)] font-[var(--bb-font-weight-medium,500)] uppercase tracking-wide mb-[var(--bb-space-1,0.25rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            Last Updated
          </p>
          <p
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            {owner.updatedAt ? new Date(owner.updatedAt).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function PetsTab({ pets, onAddPet, onRemovePet, navigate }) {
  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <div className="flex items-center justify-between">
        <h3
          className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          Pets ({pets.length})
        </h3>
        <Button size="sm" onClick={onAddPet}>
          <Plus className="h-4 w-4 mr-[var(--bb-space-2,0.5rem)]" />
          Add Pet
        </Button>
      </div>

      {pets.length === 0 ? (
        <p
          className="text-[var(--bb-font-size-sm,0.875rem)] text-center py-[var(--bb-space-8,2rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          No pets yet
        </p>
      ) : (
        <div className="space-y-[var(--bb-space-2,0.5rem)]">
          {pets.map((pet) => (
            <div
              key={pet.recordId}
              className="flex items-center gap-[var(--bb-space-3,0.75rem)] p-[var(--bb-space-3,0.75rem)] rounded-lg border transition-colors"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full cursor-pointer"
                style={{
                  backgroundColor: 'var(--bb-color-accent-soft)',
                  color: 'var(--bb-color-accent)',
                }}
                onClick={() => navigate(`/pets/${pet.recordId}`)}
              >
                <PawPrint className="h-5 w-5" />
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/pets/${pet.recordId}`)}
              >
                <p
                  className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {pet.name}
                </p>
                <p
                  className="text-[var(--bb-font-size-xs,0.75rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  {pet.breed || 'Unknown breed'}
                </p>
              </div>
              <button
                onClick={() => onRemovePet(pet)}
                className="rounded-full p-[var(--bb-space-2,0.5rem)] transition-colors"
                style={{ color: 'var(--bb-color-text-muted)' }}
                title="Remove pet"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingsTab({ bookings, ownerId, navigate, onRefresh }) {
  const checkInMutation = useBookingCheckInMutation();
  const checkOutMutation = useBookingCheckOutMutation();
  // For cancellation, we'll use a dedicated state since useUpdateBookingMutation needs bookingId
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [actionDropdownOpen, setActionDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
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
        // Navigate to booking with cancel action - cancellation should be confirmed in booking detail
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
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <div className="flex items-center justify-between">
        <h3
          className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          All Bookings ({bookings.length})
        </h3>
        <Button size="sm" onClick={() => navigate(`/bookings?action=new&ownerId=${ownerId}`)}>
          <Plus className="h-4 w-4 mr-[var(--bb-space-2,0.5rem)]" />
          New Booking
        </Button>
      </div>

      {bookings.length === 0 ? (
        <p
          className="text-[var(--bb-font-size-sm,0.875rem)] text-center py-[var(--bb-space-8,2rem)]"
          style={{ color: 'var(--bb-color-text-muted)' }}
        >
          No bookings yet
        </p>
      ) : (
        <div className="space-y-[var(--bb-space-3,0.75rem)]">
          {bookings.map((booking) => {
            const bookingId = booking.recordId || booking.id;
            const actions = getActionsForStatus(booking.status);
            const isDropdownOpen = actionDropdownOpen === bookingId;

            return (
              <div
                key={bookingId}
                className="group flex items-center justify-between p-[var(--bb-space-4,1rem)] rounded-lg border transition-all hover:shadow-sm"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => navigate(`/bookings/${bookingId}`)}
                >
                  <p
                    className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] hover:text-[color:var(--bb-color-accent)] transition-colors"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    Booking #{bookingId?.slice(0, 8)}
                  </p>
                  <p
                    className="text-[var(--bb-font-size-sm,0.875rem)]"
                    style={{ color: 'var(--bb-color-text-muted)' }}
                  >
                    {new Date(booking.checkIn).toLocaleDateString()} – {new Date(booking.checkOut).toLocaleDateString()}
                  </p>
                  {booking.pet?.name && (
                    <p className="text-[var(--bb-font-size-xs,0.75rem)] mt-1 flex items-center gap-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                      <PawPrint className="h-3 w-3" />
                      {booking.pet.name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                  <StatusPill status={booking.status} />

                  {/* Action Dropdown */}
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
                        className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-150"
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

function PaymentsTab({ payments, ownerId, navigate, onRefresh }) {
  const sendInvoiceEmailMutation = useSendInvoiceEmailMutation();
  const [actionDropdownOpen, setActionDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
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

  const handleAction = async (action, payment) => {
    const paymentId = payment.recordId || payment.id;
    const invoiceId = payment.invoiceId;
    setActionDropdownOpen(null);

    switch (action) {
      case 'viewInvoice':
        if (invoiceId) {
          navigate(`/invoices?selected=${invoiceId}`);
        } else {
          toast.error('No invoice associated with this payment');
        }
        break;
      case 'sendReceipt':
        if (invoiceId) {
          try {
            await sendInvoiceEmailMutation.mutateAsync(invoiceId);
            toast.success('Receipt sent');
          } catch (error) {
            toast.error(error?.message || 'Failed to send receipt');
          }
        } else {
          toast.error('No invoice associated with this payment');
        }
        break;
      case 'refund':
        toast.info('Refund functionality - open payment details for more options');
        // Could navigate to a refund flow
        break;
      default:
        break;
    }
  };

  const getActionsForStatus = (status, hasInvoice) => {
    const normalizedStatus = (status || '').toLowerCase();
    const actions = [];

    if (hasInvoice) {
      actions.push({ action: 'viewInvoice', label: 'View Invoice', icon: Eye });
    }

    if (normalizedStatus === 'completed' || normalizedStatus === 'paid') {
      actions.push({ action: 'sendReceipt', label: 'Send Receipt', icon: Receipt });
      actions.push({ action: 'refund', label: 'Process Refund', icon: RefreshCw });
    }

    return actions.length > 0 ? actions : [{ action: 'viewInvoice', label: 'View Details', icon: Eye }];
  };

  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <div className="flex items-center justify-between">
        <h3
          className="text-[var(--bb-font-size-md,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          Payment History ({payments.length})
        </h3>
        <Button size="sm" onClick={() => navigate(`/invoices?action=new&ownerId=${ownerId}`)}>
          <Plus className="h-4 w-4 mr-[var(--bb-space-2,0.5rem)]" />
          Create Invoice
        </Button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-[var(--bb-space-8,2rem)]">
          <p
            className="text-[var(--bb-font-size-sm,0.875rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            No payments yet
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-[var(--bb-space-4,1rem)]"
            onClick={() => navigate(`/invoices?action=new&ownerId=${ownerId}`)}
          >
            <FileText className="h-4 w-4 mr-[var(--bb-space-2,0.5rem)]" />
            Create First Invoice
          </Button>
        </div>
      ) : (
        <div className="space-y-[var(--bb-space-3,0.75rem)]">
          {payments.map((payment) => {
            const paymentId = payment.recordId || payment.id;
            const hasInvoice = !!payment.invoiceId;
            const actions = getActionsForStatus(payment.status, hasInvoice);
            const isDropdownOpen = actionDropdownOpen === paymentId;

            return (
              <div
                key={paymentId}
                className="group flex items-center justify-between p-[var(--bb-space-4,1rem)] rounded-lg border transition-all hover:shadow-sm"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <div className="flex-1">
                  <p
                    className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)]"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    {formatCurrency(payment.amountCents || 0)}
                  </p>
                  <p
                    className="text-[var(--bb-font-size-sm,0.875rem)]"
                    style={{ color: 'var(--bb-color-text-muted)' }}
                  >
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                  {payment.invoiceNumber && (
                    <p className="text-[var(--bb-font-size-xs,0.75rem)] mt-1 flex items-center gap-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                      <FileText className="h-3 w-3" />
                      Invoice #{payment.invoiceNumber}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-[var(--bb-space-3,0.75rem)]">
                  <StatusPill status={payment.status} />

                  {/* Action Dropdown */}
                  {actions.length > 0 && (
                    <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionDropdownOpen(isDropdownOpen ? null : paymentId);
                        }}
                        className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-[var(--bb-color-bg-elevated)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {isDropdownOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 z-50 w-44 rounded-lg border shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-150"
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
                                  handleAction(item.action, payment);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bb-color-bg-elevated)]"
                                style={{ color: 'var(--bb-color-text-primary)' }}
                              >
                                <ActionIcon className={cn(
                                  'h-4 w-4',
                                  item.action === 'sendReceipt' && 'text-green-600',
                                  item.action === 'refund' && 'text-amber-500'
                                )} />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OwnerDetail;
