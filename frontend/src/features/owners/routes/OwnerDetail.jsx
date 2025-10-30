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
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import RecordDetailsView from '@/components/RecordDetailsView';
import AssociationModal from '@/components/ui/AssociationModal';
import Button from '@/components/ui/Button';
import { SectionCard, InfoRow, StatusPill } from '@/components/primitives';
import { useOwnerQuery, useDeleteOwnerMutation, useAddPetToOwnerMutation, useRemovePetFromOwnerMutation } from '../api';
import { usePetsQuery, useCreatePetMutation } from '@/features/pets/api';
import { useAssociationsForObjectPairQuery } from '@/features/settings/api/associations';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';

const OwnerDetail = () => {
  const { ownerId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');

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
  // FIX: petsQuery.data is already the array of pets, not { data: [...] }
  const allPets = petsQuery.data ?? [];

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
      queryClient.invalidateQueries({ queryKey: queryKeys.owners(tenantKey) });
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
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey) });

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
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey) });
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
      queryClient.invalidateQueries({ queryKey: [...queryKeys.owners(tenantKey), ownerId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey) });
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

  const summaryProps = useMemo(() => ({
    avatar: (
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
        <UsersIcon className="h-8 w-8" />
      </div>
    ),
    actionButtons: [
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
    ],
  }), []);

  const actions = (
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

  const tabs = useMemo(() => [
    { recordId: 'overview',
      label: 'Overview',
      render: (record) => {
        const timelineBookings = (record?.bookings || []).slice(0, 10);
        return (
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
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
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
        );
      },
    },
    { recordId: 'bookings',
      label: 'Bookings',
      render: (record) => {
        const allBookings = record?.bookings || [];
        return (
          <SectionCard title="All Bookings" variant="spacious">
            <div className="space-y-3">
              {allBookings.length === 0 && (
                <p className="text-sm text-muted">No bookings yet</p>
              )}
              {allBookings.map((booking) => (
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
        );
      },
    },
    { recordId: 'payments',
      label: 'Payments',
      render: (record) => {
        const allPayments = record?.payments || [];
        return (
          <SectionCard title="Payment History" variant="spacious">
            <div className="space-y-3">
              {allPayments.length === 0 && (
                <p className="text-sm text-muted">No payments yet</p>
              )}
              {allPayments.map((payment) => (
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
        );
      },
    },
  ], [bookings, payments]);

  const asideSections = useMemo(() => [
    { recordId: 'pets',
      title: `Pets (${pets.length})`,
      header: (
        <Button size="xs" variant="ghost" onClick={() => setAddPetModalOpen(true)}>
          + Add
        </Button>
      ),
      render: (record) => {
        const recordPets = record?.pets || [];
        if (recordPets.length === 0) {
          return <p className="text-sm text-muted">No pets yet</p>;
        }

        return (
          <div className="space-y-2">
            {recordPets.map((pet) => (
              <div
                key={pet.recordId}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2 transition hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  🐾
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{pet.name}</p>
                  <p className="text-xs text-muted">{pet.breed || 'Unknown breed'}</p>
                </div>
                <button
                  onClick={() => handleRemovePet(pet)}
                  className="rounded-full p-1 text-muted transition hover:bg-red-50 hover:text-red-600"
                  title="Remove pet"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        );
      },
    },
    { recordId: 'metrics',
      title: 'Key Metrics',
      render: () => (
        <div className="space-y-3">
          <InfoRow label="Total Bookings" value={bookings.length} />
          <InfoRow
            label="Lifetime Value"
            value={`$${lifetimeValue.toFixed(2)}`}
          />
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
      ),
    },
    { recordId: 'activity',
      title: 'Recent Activity',
      render: (record) => {
        const recent = (record?.bookings || []).slice(0, 3);
        if (recent.length === 0) {
          return <p className="text-sm text-muted">No recent activity</p>;
        }

        return (
          <div className="space-y-2">
            {recent.map((booking) => (
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
        );
      },
    },
  ], [bookings, lifetimeValue, pets]);

  return (
    <>
    <RecordDetailsView
      objectType="owner"
      recordId={ownerId}
      data={owner}
      fetchOnMount={false}
      title={fullName}
      subtitle={owner.email}
      actions={actions}
      summaryTitle="Owner Summary"
      summaryProps={summaryProps}
      tabs={tabs}
      asideSections={asideSections}
    />

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
              Pet Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="petName"
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
