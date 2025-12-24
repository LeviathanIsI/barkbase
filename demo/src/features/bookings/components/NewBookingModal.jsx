/**
 * New Booking Modal - Demo Version
 * Simplified booking creation form with pet/owner selection.
 */

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, PawPrint, User, Check } from 'lucide-react';
import SlideoutPanel from '@/components/ui/SlideoutPanel';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { usePetsQuery } from '@/features/pets/api';
import { useOwnersQuery } from '@/features/owners/api';
import { useCreateBookingMutation } from '../api';

// Format date for input
const formatDateForInput = (date) => {
  return date.toISOString().split('T')[0];
};

const NewBookingModal = ({ isOpen, onClose, onSuccess }) => {
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);

  // Queries
  const { data: ownersResult } = useOwnersQuery();
  const { data: petsResult } = usePetsQuery();
  const createMutation = useCreateBookingMutation();

  const owners = ownersResult?.data || [];
  const allPets = petsResult?.data || [];

  // Filter pets by selected owner
  const ownerPets = useMemo(() => {
    if (!selectedOwner) return [];
    return allPets.filter((p) => p.ownerId === selectedOwner.id);
  }, [selectedOwner, allPets]);

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      checkIn: formatDateForInput(new Date()),
      checkOut: formatDateForInput(new Date(Date.now() + 86400000)),
      serviceType: 'boarding',
      notes: '',
    },
  });

  const handleClose = () => {
    reset();
    setSelectedOwner(null);
    setSelectedPet(null);
    onClose();
  };

  const onSubmit = async (data) => {
    if (!selectedOwner || !selectedPet) return;

    try {
      await createMutation.mutateAsync({
        ownerId: selectedOwner.id,
        petId: selectedPet.id,
        startDate: data.checkIn,
        endDate: data.checkOut,
        serviceName:
          data.serviceType === 'boarding'
            ? 'Overnight Boarding'
            : data.serviceType === 'daycare'
            ? 'Full Day Daycare'
            : 'Grooming',
        serviceId: `svc-${data.serviceType}`,
        notes: data.notes,
        subtotal: data.serviceType === 'boarding' ? 100 : data.serviceType === 'daycare' ? 50 : 75,
      });

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Failed to create booking:', error);
    }
  };

  const inputClass = cn(
    'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
    'focus:outline-none focus:ring-1 focus:ring-[var(--bb-color-accent)]'
  );

  const inputStyles = {
    backgroundColor: 'var(--bb-color-bg-body)',
    borderColor: 'var(--bb-color-border-subtle)',
    color: 'var(--bb-color-text-primary)',
  };

  return (
    <SlideoutPanel
      open={isOpen}
      onClose={handleClose}
      title="New Booking"
      subtitle="Create a new pet boarding reservation"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Owner Selection */}
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4 flex items-center gap-2">
              <User className="h-4 w-4" />
              Select Owner
            </h3>
            {selectedOwner ? (
              <div
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{
                  borderColor: 'var(--bb-color-accent)',
                  backgroundColor: 'var(--bb-color-accent-soft)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--bb-color-purple-soft)]">
                    <User className="h-5 w-5 text-[color:var(--bb-color-purple)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[color:var(--bb-color-text-primary)]">
                      {selectedOwner.firstName} {selectedOwner.lastName}
                    </p>
                    <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                      {selectedOwner.email}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOwner(null);
                    setSelectedPet(null);
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {owners.map((owner) => (
                  <button
                    key={owner.id}
                    type="button"
                    onClick={() => setSelectedOwner(owner)}
                    className="p-3 rounded-lg border text-left transition-colors hover:border-[color:var(--bb-color-accent)]"
                    style={{
                      borderColor: 'var(--bb-color-border-subtle)',
                      backgroundColor: 'var(--bb-color-bg-elevated)',
                    }}
                  >
                    <p className="font-medium text-sm text-[color:var(--bb-color-text-primary)]">
                      {owner.firstName} {owner.lastName}
                    </p>
                    <p className="text-xs text-[color:var(--bb-color-text-muted)]">{owner.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pet Selection */}
          {selectedOwner && (
            <div>
              <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4 flex items-center gap-2">
                <PawPrint className="h-4 w-4" />
                Select Pet
              </h3>
              {ownerPets.length === 0 ? (
                <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                  No pets found for this owner
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {ownerPets.map((pet) => {
                    const isSelected = selectedPet?.id === pet.id;
                    return (
                      <button
                        key={pet.id}
                        type="button"
                        onClick={() => setSelectedPet(pet)}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-colors flex items-center gap-3',
                          isSelected && 'ring-2 ring-[color:var(--bb-color-accent)]'
                        )}
                        style={{
                          borderColor: isSelected
                            ? 'var(--bb-color-accent)'
                            : 'var(--bb-color-border-subtle)',
                          backgroundColor: isSelected
                            ? 'var(--bb-color-accent-soft)'
                            : 'var(--bb-color-bg-elevated)',
                        }}
                      >
                        <PawPrint
                          className="h-5 w-5"
                          style={{
                            color: isSelected
                              ? 'var(--bb-color-accent)'
                              : 'var(--bb-color-text-muted)',
                          }}
                        />
                        <div>
                          <p className="font-medium text-sm text-[color:var(--bb-color-text-primary)]">
                            {pet.name}
                          </p>
                          <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                            {pet.breed || pet.species}
                          </p>
                        </div>
                        {isSelected && (
                          <Check
                            className="h-4 w-4 ml-auto"
                            style={{ color: 'var(--bb-color-accent)' }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Booking Details */}
          {selectedPet && (
            <div>
              <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Booking Details
              </h3>

              <div className="space-y-4">
                {/* Service Type */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                    Service Type
                  </label>
                  <select
                    {...register('serviceType')}
                    className={inputClass}
                    style={inputStyles}
                  >
                    <option value="boarding">Overnight Boarding</option>
                    <option value="daycare">Daycare</option>
                    <option value="grooming">Grooming</option>
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                      Check-In Date
                    </label>
                    <input
                      type="date"
                      {...register('checkIn', { required: true })}
                      className={inputClass}
                      style={inputStyles}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                      Check-Out Date
                    </label>
                    <input
                      type="date"
                      {...register('checkOut', { required: true })}
                      className={inputClass}
                      style={inputStyles}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                    Special Instructions
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Any special care instructions..."
                    className={cn(inputClass, 'resize-none')}
                    style={inputStyles}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!selectedOwner || !selectedPet || createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Booking'}
          </Button>
        </div>
      </form>
    </SlideoutPanel>
  );
};

export default NewBookingModal;
