import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users as UsersIcon,
  Mail,
  Edit,
  Trash2,
  Calendar,
  FileText,
  PhoneCall,
  ClipboardList,
  Video,
  X,
  PawPrint,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import AssociationModal from '@/components/ui/AssociationModal';
import Button from '@/components/ui/Button';
import { SectionCard, InfoRow, StatusPill, TagList } from '@/components/primitives';
import { useOwnerQuery, useDeleteOwnerMutation, useAddPetToOwnerMutation, useRemovePetFromOwnerMutation } from '../api';
import { usePetsQuery, useCreatePetMutation } from '@/features/pets/api';
import { useAssociationsForObjectPairQuery } from '@/features/settings/api/associations';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import { PageHeader } from '@/components/ui/Card';
import OwnerInfoSection from '@/features/directory/components/OwnerInfoSection';
import RelatedPetsSection from '@/features/directory/components/RelatedPetsSection';

// TODO (C1:3 - Directory UX Cleanup): Align Owner detail layout with shared directory styling.
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
    // TODO: Open edit modal or navigate to edit page
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
      // Handle array of associations
      for (const { recordId, label } of associations) {
        // label is now the association definition ID
        // Find the association definition to check if it's a primary association
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
      // Get form values
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
      // Automatically associate the new pet with this owner
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

  if (ownerQuery.isLoading) {
    return (
      <div className="p-8 text-sm text-muted">
        Loading owner details...
      </div>
    );
  }

  if (!owner) {
    return <div className="p-8">Owner not found</div>;
  }

  const fullName = `${owner.firstName} ${owner.lastName}`;
  // Backend already transforms pets array, so owner.pets is already an array of pet objects
  const pets = owner.pets?.filter(pet => pet && pet.recordId) || [];
  const bookings = owner.bookings || [];
  const payments = owner.payments || [];
  const lifetimeValue = payments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;

  const actionButtons = useMemo(() => [
    {
      label: 'Note',
      icon: <FileText className="h-4 w-4" />,
      onClick: () => toast.info('Add note coming soon'),
    },
    {
      label: 'Email',
      icon: <Mail className="h-4 w-4" />,
      onClick: () => toast.info('Send email coming soon'),
    },
    {
      label: 'Call',
      icon: <PhoneCall className="h-4 w-4" />,
      onClick: () => toast.info('Make call coming soon'),
    },
    {
      label: 'Task',
      icon: <ClipboardList className="h-4 w-4" />,
      onClick: () => toast.info('Create task coming soon'),
    },
    {
      label: 'Meeting',
      icon: <Video className="h-4 w-4" />,
      onClick: () => toast.info('Schedule meeting coming soon'),
    },
  ], []);

  const ownerPets = pets;
  const ownerAddress = owner.address
    ? [owner.address.street, owner.address.city, owner.address.state, owner.address.zip].filter(Boolean).join(', ')
    : null;
  const timelineBookings = bookings.slice(0, 10);
  const recentActivity = bookings.slice(0, 3);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button size="sm" icon={<Edit className="h-4 w-4" />} onClick={handleEdit}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        icon={<Trash2 className="h-4 w-4" />}
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  );

  return (
    <>
    <div className="space-y-6">
      <PageHeader
        title={fullName || 'Owner'}
        subtitle={owner.email || ''}
        breadcrumb="Home > Clients > Owners"
        actions={headerActions}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <OwnerInfoSection>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 dark:bg-surface-secondary text-purple-600 dark:text-purple-400">
                  <UsersIcon className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <div>
                    <h2 className="text-2xl font-semibold text-text">
                      {fullName || 'Owner'}
                    </h2>
                    {owner.email && <p className="text-sm text-muted">{owner.email}</p>}
                    {owner.phone && <p className="text-sm text-muted">{owner.phone}</p>}
                  </div>
                  <StatusPill status={owner.status ?? 'active'} />
                </div>
              </div>
            </div>

            {actionButtons.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {actionButtons.map((action) => (
                  <Button
                    key={action.label}
                    size="sm"
                    variant={action.variant ?? 'outline'}
                    icon={action.icon}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <InfoRow label="Email" value={owner.email} copyable />
                <InfoRow label="Phone" value={owner.phone} />
                <InfoRow label="Address" value={ownerAddress} />
              </div>
              <div className="space-y-3">
                <InfoRow
                  label="Created"
                  value={owner.createdAt ? new Date(owner.createdAt).toLocaleString() : null}
                />
                <InfoRow
                  label="Updated"
                  value={owner.updatedAt ? new Date(owner.updatedAt).toLocaleString() : null}
                />
                <InfoRow label="Total Pets" value={ownerPets.length} />
              </div>
            </div>

            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                Behavior Flags
              </p>
              <TagList tags={owner.behaviorFlags || []} emptyLabel="No behavior flags" />
            </div>
          </OwnerInfoSection>

          <SectionCard title="Activity Timeline">
            <div className="space-y-4">
              {timelineBookings.length === 0 && (
                <p className="text-sm text-muted">No activity yet</p>
              )}
              {timelineBookings.map((booking) => (
                <div
                  key={booking.recordId}
                  className="flex gap-4 border-b border-border pb-4 last:border-0"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-surface-secondary text-blue-600 dark:text-blue-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Booking #{booking.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(booking.checkIn).toLocaleDateString()} –{' '}
                      {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                    <div className="mt-1">
                      <StatusPill status={booking.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="All Bookings" variant="spacious">
            <div className="space-y-3">
              {bookings.length === 0 && (
                <p className="text-sm text-muted">No bookings yet</p>
              )}
              {bookings.map((booking) => (
                <div
                  key={booking.recordId}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">Booking #{booking.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted">
                      {new Date(booking.checkIn).toLocaleDateString()} –{' '}
                      {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={booking.status} />
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Payment History" variant="spacious">
            <div className="space-y-3">
              {payments.length === 0 && (
                <p className="text-sm text-muted">No payments yet</p>
              )}
              {payments.map((payment) => (
                <div
                  key={payment.recordId}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      ${(payment.amountCents / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusPill status={payment.status} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <RelatedPetsSection
            title={`Pets (${ownerPets.length})`}
            actions={
              <Button size="xs" variant="ghost" onClick={() => setAddPetModalOpen(true)}>
                + Add
              </Button>
            }
          >
            {ownerPets.length === 0 ? (
              <p className="text-sm text-muted">No pets yet</p>
            ) : (
              <div className="space-y-2">
                {ownerPets.map((pet) => (
                  <div
                    key={pet.recordId}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-surface-secondary"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                      <PawPrint className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{pet.name}</p>
                      <p className="text-xs text-muted">{pet.breed || 'Unknown breed'}</p>
                    </div>
                    <button
                      onClick={() => handleRemovePet(pet)}
                      className="rounded-full p-1 text-muted transition hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                      title="Remove pet"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </RelatedPetsSection>

          <SectionCard title="Key Metrics">
            <div className="space-y-3">
              <InfoRow label="Total Bookings" value={bookings.length} />
              <InfoRow label="Lifetime Value" value={`$${lifetimeValue.toFixed(2)}`} />
              <InfoRow
                label="Last Booking"
                value={
                  bookings[0]
                    ? new Date(bookings[0].checkIn).toLocaleDateString()
                    : 'Never'
                }
              />
              <InfoRow
                label="Average Booking Value"
                value={
                  bookings.length > 0
                    ? `$${(lifetimeValue / bookings.length).toFixed(2)}`
                    : '$0.00'
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Recent Activity">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((booking) => (
                  <div key={booking.recordId} className="rounded-md border border-border p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted" />
                      <span className="text-xs font-medium text-muted">
                        {new Date(booking.checkIn).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">Booking #{booking.id.slice(0, 8)}</p>
                    <div className="mt-1">
                      <StatusPill status={booking.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>

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
          <p className="text-sm text-muted">
            Create a new pet and automatically associate it with {fullName}.
          </p>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Pet Name <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              id="petName"
              className="w-full rounded-md border border-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Enter pet name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Breed
            </label>
            <input
              type="text"
              id="petBreed"
              className="w-full rounded-md border border-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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

export default OwnerDetail;
