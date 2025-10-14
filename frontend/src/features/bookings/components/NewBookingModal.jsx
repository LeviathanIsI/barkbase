import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { addDays, format } from 'date-fns';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useCreateBookingMutation } from '../api';
import { usePetsQuery } from '@/features/pets/api';
import { useKennelAvailability } from '@/features/kennels/api';
import { useTerminology } from '@/lib/terminology';

const defaultValues = {
  petId: '',
  ownerId: '',
  checkIn: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  checkOut: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
  kennelId: '',
  depositCents: 0,
  totalCents: 0,
  notes: '',
  specialInstructions: '',
  status: 'PENDING',
};

const NewBookingModal = ({ open, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [owners, setOwners] = useState([]);
  const mutation = useCreateBookingMutation();
  const petsQuery = usePetsQuery();
  const kennelQuery = useKennelAvailability();
  const terminology = useTerminology();
  const { register, handleSubmit, reset, watch, setValue } = useForm({ defaultValues });

  const selectedPetId = watch('petId');
  const pets = petsQuery.data ?? [];
  const kennels = kennelQuery.data ?? [];

  // Auto-populate owner when pet is selected
  useEffect(() => {
    if (selectedPetId && pets.length) {
      const selectedPet = pets.find((p) => p.recordId === selectedPetId);
      if (selectedPet?.ownerId) {
        setValue('ownerId', selectedPet.ownerId);
      }
    }
  }, [selectedPetId, pets, setValue]);

  // Fetch owners list from pets data
  useEffect(() => {
    if (pets.length) {
      const uniqueOwners = new Map();
      pets.forEach((pet) => {
        if (pet.owner && pet.ownerId && !uniqueOwners.has(pet.ownerId)) {
          uniqueOwners.set(pet.ownerId, { recordId: pet.ownerId,
            name: `${pet.owner.firstName ?? ''} ${pet.owner.lastName ?? ''}`.trim(),
          });
        }
      });
      setOwners(Array.from(uniqueOwners.values()));
    }
  }, [pets]);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
    }
  }, [open, reset]);

  const onSubmit = async (values) => {
    if (!values.petId || !values.ownerId || !values.kennelId) {
      toast.error('Please select pet, owner, and kennel.');
      return;
    }

    const payload = {
      petId: values.petId,
      ownerId: values.ownerId,
      status: values.status,
      checkIn: new Date(values.checkIn).toISOString(),
      checkOut: new Date(values.checkOut).toISOString(),
      depositCents: Math.round(Number(values.depositCents) * 100),
      totalCents: Math.round(Number(values.totalCents) * 100),
      balanceDueCents: Math.round((Number(values.totalCents) - Number(values.depositCents)) * 100),
      notes: values.notes || '',
      specialInstructions: values.specialInstructions || '',
      segments: [
        {
          kennelId: values.kennelId,
          startDate: new Date(values.checkIn).toISOString(),
          endDate: new Date(values.checkOut).toISOString(),
          status: 'CONFIRMED',
        },
      ],
      services: [],
    };

    try {
      setIsSubmitting(true);
      await mutation.mutateAsync(payload);
      toast.success('Booking created successfully!');
      onClose?.();
    } catch (error) {
      toast.error(error?.message ?? 'Failed to create booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Booking"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Booking'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Pet <span className="text-red-500">*</span>
          </label>
          <select
            {...register('petId', { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select a pet...</option>
            {pets.map((pet) => (
              <option key={pet.recordId} value={pet.recordId}>
                {pet.name} ({pet.species ?? 'Unknown'})
              </option>
            ))}
          </select>
          {petsQuery.isLoading && <p className="text-xs text-muted">Loading pets...</p>}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Owner <span className="text-red-500">*</span>
          </label>
          <select
            {...register('ownerId', { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select an owner...</option>
            {owners.map((owner) => (
              <option key={owner.recordId} value={owner.recordId}>
                {owner.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            {terminology.getAccommodationType('KENNEL')} Assignment <span className="text-red-500">*</span>
          </label>
          <select
            {...register('kennelId', { required: true })}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">Select a {terminology.kennel.toLowerCase()}...</option>
            {kennels.map((kennel) => (
              <option key={kennel.recordId} value={kennel.recordId}>
                {terminology.getDisplayName(kennel.type, kennel.name, kennel.number)} - {terminology.getAccommodationType(kennel.type)}
              </option>
            ))}
          </select>
          {kennelQuery.isLoading && <p className="text-xs text-muted">Loading {terminology.kennels}...</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Check-In <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              {...register('checkIn', { required: true })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Check-Out <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              {...register('checkOut', { required: true })}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Status</label>
          <select
            {...register('status')}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Deposit ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('depositCents')}
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Total Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('totalCents')}
              placeholder="0.00"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Special Instructions</label>
          <textarea
            rows={3}
            {...register('specialInstructions')}
            placeholder="Feeding instructions, medication notes, behavior considerations..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Internal Notes</label>
          <textarea
            rows={2}
            {...register('notes')}
            placeholder="Staff notes, payment tracking, etc..."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </form>
    </Modal>
  );
};

export default NewBookingModal;
