import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import { useTenantStore } from '@/stores/tenant';
import { queryKeys } from '@/lib/queryKeys';
import PetProfile from '../components/PetProfile';
import VaccinationTimeline from '../components/VaccinationTimeline';
import {
  usePetsQuery,
  useCreatePetMutation,
  useUpdatePetMutation,
  useDeletePetMutation,
} from '../api';

const formatCurrency = (valueCents = 0, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(valueCents / 100);

const Pets = () => {
  const petsQuery = usePetsQuery();
  const pets = useMemo(() => petsQuery.data ?? [], [petsQuery.data]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const tenantKey = useTenantStore((state) => state.tenant?.slug ?? 'default');
  const queryClient = useQueryClient();
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { isSubmitting: isSaving },
  } = useForm({
    defaultValues: {
      medicalNotes: '',
      dietaryNotes: '',
    },
  });
  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    formState: { isSubmitting: isCreating },
  } = useForm({
    defaultValues: {
      name: '',
      breed: '',
      ownerIds: '',
    },
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const createPetMutation = useCreatePetMutation();
  const updatePetMutation = useUpdatePetMutation(selectedPetId);
  const deletePetMutation = useDeletePetMutation();

  useEffect(() => {
    if (petsQuery.isError) {
      toast.error(petsQuery.error?.message ?? 'Unable to load pets', { id: 'pets-error' });
    }
  }, [petsQuery.isError, petsQuery.error]);

  useEffect(() => {
    if (!selectedPetId && pets.length) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  const selectedPet = useMemo(
    () => pets.find((pet) => pet.id === selectedPetId) ?? null,
    [pets, selectedPetId],
  );

  useEffect(() => {
    if (selectedPet) {
      resetEdit({
        medicalNotes: selectedPet.medicalNotes ?? '',
        dietaryNotes: selectedPet.dietaryNotes ?? '',
      });
    }
  }, [selectedPet, resetEdit]);

  const onSubmit = async (values) => {
    if (!selectedPet) return;
    try {
      await updatePetMutation.mutateAsync(values);
      toast.success('Pet details updated');
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey, {}) });
    } catch (error) {
      toast.error(error.message ?? 'Unable to update pet');
    }
  };

  const bookings = selectedPet?.bookings ?? [];
  const vaccinations = selectedPet?.vaccinations ?? [];

  const handleCreate = async (values) => {
    const ownerIds = values.ownerIds
      .split(',')
      .map((ownerId) => ownerId.trim())
      .filter(Boolean);

    if (ownerIds.length === 0) {
      toast.error('Provide at least one owner ID');
      return;
    }

    try {
      const created = await createPetMutation.mutateAsync({
        name: values.name,
        breed: values.breed || undefined,
        ownerIds,
      });
      toast.success('Pet created');
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey, {}) });
      resetCreate({ name: '', breed: '', ownerIds: '' });
      setShowCreateForm(false);
      if (created?.id) {
        setSelectedPetId(created.id);
      }
    } catch (error) {
      toast.error(error.message ?? 'Unable to create pet');
    }
  };

  const handleDelete = async () => {
    if (!selectedPet) return;
    const shouldDelete = window.confirm(`Delete ${selectedPet.pet?.name ?? selectedPet.name}?`);
    if (!shouldDelete) return;
    try {
      await deletePetMutation.mutateAsync(selectedPet.id);
      toast.success('Pet removed');
      queryClient.invalidateQueries({ queryKey: queryKeys.pets(tenantKey, {}) });
      setSelectedPetId(null);
    } catch (error) {
      toast.error(error.message ?? 'Unable to delete pet');
    }
  };

  return (
    <DashboardLayout
      title="Pet Management"
      description="Detailed history, medical tracking, and owner collaboration tools."
      actions={
        <Button variant={showCreateForm ? 'ghost' : 'default'} onClick={() => setShowCreateForm((value) => !value)}>
          {showCreateForm ? 'Close Form' : 'New Pet'}
        </Button>
      }
    >
      {showCreateForm ? (
        <Card title="Create Pet" description="Provide a name and owner identifiers to add a new pet.">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateSubmit(handleCreate)}>
            <label className="text-sm font-medium text-text">
              Name
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                {...registerCreate('name', { required: true })}
              />
            </label>
            <label className="text-sm font-medium text-text">
              Breed
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                {...registerCreate('breed')}
              />
            </label>
            <label className="text-sm font-medium text-text md:col-span-2">
              Owner IDs
              <input
                type="text"
                placeholder="owner-1, owner-2"
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                {...registerCreate('ownerIds', { required: true })}
              />
              <span className="mt-1 block text-xs text-muted">Comma-separated owner IDs from your CRM.</span>
            </label>
            <div className="flex items-center gap-2 md:col-span-2">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Saving…' : 'Create Pet'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
        <Card title="Pets" description="Select a pet to review their profile.">
          {petsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : pets.length === 0 ? (
            <p className="text-sm text-muted">No pets found for this tenant.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {pets.map((pet) => (
                <li key={pet.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                      pet.id === selectedPetId
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-surface text-text hover:border-primary/60'
                    }`}
                  >
                    <span>{pet.name}</span>
                    {pet.bookings?.[0] && (
                      <span className="text-xs text-muted">
                        Last stay {new Date(pet.bookings[0].checkIn).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="space-y-6">
          {selectedPet ? (
            <>
              <PetProfile pet={selectedPet} />
              <Card title="Health Notes" description="Keep team members informed with the latest updates.">
                <form className="grid gap-4" onSubmit={handleEditSubmit(onSubmit)}>
                  <label className="text-sm font-medium text-text">
                    Medical Notes
                    <textarea
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      {...registerEdit('medicalNotes')}
                    />
                  </label>
                  <label className="text-sm font-medium text-text">
                    Dietary Notes
                    <textarea
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                      {...registerEdit('dietaryNotes')}
                    />
                  </label>
                  <div className="flex justify-end">
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" onClick={handleDelete} disabled={deletePetMutation.isPending}>
                        Delete
                      </Button>
                      <Button type="submit" disabled={petsQuery.isLoading || isSaving || updatePetMutation.isPending}>
                        {updatePetMutation.isPending ? 'Saving…' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
              <div className="grid gap-6 lg:grid-cols-2">
                <VaccinationTimeline vaccinations={vaccinations} />
                <Card
                  title="Recent Bookings"
                  description="Last five stays with balances remaining."
                >
                  {bookings.length === 0 ? (
                    <p className="text-xs text-muted">No stays logged yet.</p>
                  ) : (
                    <ul className="space-y-3 text-sm">
                      {bookings.map((booking) => (
                        <li
                          key={booking.id}
                          className="rounded-xl border border-border/60 bg-surface/60 p-3"
                        >
                          <p className="font-medium text-text">
                            {new Date(booking.checkIn).toLocaleDateString()} –
                            {' '}
                            {new Date(booking.checkOut).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted">Status · {booking.status}</p>
                          <p className="text-xs text-muted">
                            Balance {formatCurrency(booking.balanceDueCents)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </>
          ) : (
            <Card title="Select a pet">
              <p className="text-sm text-muted">Choose a pet from the list to view details.</p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Pets;
