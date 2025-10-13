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
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      name: '',
      breed: '',
      status: 'active',
      medicalNotes: '',
      dietaryNotes: '',
      birthdate: '',
    },
  });

  // Reset form when pet changes or modal opens
  useEffect(() => {
    if (pet) {
      reset({
        name: pet.name || '',
        breed: pet.breed || '',
        status: pet.status || 'active',
        medicalNotes: pet.medicalNotes || '',
        dietaryNotes: pet.dietaryNotes || '',
        birthdate: pet.birthdate ? new Date(pet.birthdate).toISOString().split('T')[0] : '',
      });
    } else if (open) {
      reset({
        name: '',
        breed: '',
        status: 'active',
        medicalNotes: '',
        dietaryNotes: '',
        birthdate: '',
      });
    }
  }, [pet, open, reset]);

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
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
        <div className="grid grid-cols-2 gap-4">
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

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4">
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

        {/* Medical Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Medical Notes
          </label>
          <textarea
            {...register('medicalNotes')}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Any allergies, medications, or health conditions..."
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
