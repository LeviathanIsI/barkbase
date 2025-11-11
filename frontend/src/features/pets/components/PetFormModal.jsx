import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const PetFormModal = ({
  open,
  onClose,
  onSubmit,
  pet = null,
  isLoading = false,
}) => {
  const isEdit = !!pet;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      name: '',
      species: '',
      breed: '',
      status: 'active',
      medicalNotes: '',
      dietaryNotes: '',
      birthdate: '',
      weight: '',
      allergies: '',
      lastVetVisit: '',
      nextAppointment: '',
      behaviorFlags: [],
      photoUrl: '',
    },
  });

  // Reset form when pet changes or modal opens
  useEffect(() => {
    if (pet) {
      reset({
        name: pet.name || '',
        species: pet.species || '',
        breed: pet.breed || '',
        status: pet.status || 'active',
        medicalNotes: pet.medicalNotes || '',
        dietaryNotes: pet.dietaryNotes || '',
        birthdate: pet.birthdate ? new Date(pet.birthdate).toISOString().split('T')[0] : '',
        weight: pet.weight || '',
        allergies: pet.allergies || '',
        lastVetVisit: pet.lastVetVisit ? new Date(pet.lastVetVisit).toISOString().split('T')[0] : '',
        nextAppointment: pet.nextAppointment ? new Date(pet.nextAppointment).toISOString().split('T')[0] : '',
        behaviorFlags: pet.behaviorFlags || [],
        photoUrl: pet.photoUrl || '',
      });
    } else if (open) {
      reset({
        name: '',
        species: '',
        breed: '',
        status: 'active',
        medicalNotes: '',
        dietaryNotes: '',
        birthdate: '',
        weight: '',
        allergies: '',
        lastVetVisit: '',
        nextAppointment: '',
        behaviorFlags: [],
        photoUrl: '',
      });
    }
  }, [pet, open, reset]);

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
  };

  const normalizeBehaviorFlags = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (typeof value === 'object') {
      return Object.entries(value)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k);
    }
    return [];
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Pet' : 'Create New Pet'}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('name', { required: 'Pet name is required' })}
              className={cn(
                'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                errors.name && 'border-red-500'
              )}
              placeholder="Buddy"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Breed
            </label>
            <input
              type="text"
              {...register('breed')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Golden Retriever"
            />
          </div>
        </div>

        {/* Species and Weight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Species
            </label>
            <select
              {...register('species')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select species</option>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Bird">Bird</option>
              <option value="Rabbit">Rabbit</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Weight (lbs)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('weight')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="25.5"
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Birthdate
            </label>
            <input
              type="date"
              {...register('birthdate')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Allergies */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Allergies
          </label>
          <input
            type="text"
            {...register('allergies')}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Pollen, chicken, medication names..."
          />
        </div>

        {/* Vet Visit Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Last Vet Visit
            </label>
            <input
              type="date"
              {...register('lastVetVisit')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Next Appointment
            </label>
            <input
              type="date"
              {...register('nextAppointment')}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Medical Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Medical Notes
          </label>
          <textarea
            {...register('medicalNotes')}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Additional health conditions, medications, or special care instructions..."
          />
        </div>

        {/* Dietary Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Dietary Notes
          </label>
          <textarea
            {...register('dietaryNotes')}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Food preferences, restrictions, or feeding schedule..."
          />
        </div>

        {/* Photo URL */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Photo URL
          </label>
          <input
            type="url"
            {...register('photoUrl')}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="https://example.com/pet-photo.jpg"
          />
        </div>

        {/* Behavior Flags */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Behavior Flags
          </label>
          <p className="text-xs text-muted mb-3">Select all behaviors that apply to this pet</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Friendly',
              'Shy',
              'Aggressive',
              'Reactive',
              'Anxious',
              'Playful',
              'Calm',
              'Energetic',
              'Food motivated',
              'Treat motivated'
            ].map((flag) => (
              <label key={flag} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={normalizeBehaviorFlags(watch('behaviorFlags')).includes(flag)}
                  onChange={(e) => {
                    const currentFlags = normalizeBehaviorFlags(watch('behaviorFlags'));
                    const newFlags = e.target.checked
                      ? [...currentFlags, flag]
                      : currentFlags.filter(f => f !== flag);
                    setValue('behaviorFlags', newFlags);
                  }}
                  className="rounded border-border"
                />
                <span className="text-sm">{flag}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || (!isDirty && isEdit)}
          >
            {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Pet' : 'Create Pet')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PetFormModal;
