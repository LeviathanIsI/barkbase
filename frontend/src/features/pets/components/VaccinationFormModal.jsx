import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';

// Standardized vaccine types
const VACCINE_TYPES = {
  DOG: [
    'Rabies',
    'DAPP',
    'DHPP',
    'Bordetella',
    'Influenza',
    'Leptospirosis',
  ],
  CAT: [
    'Rabies',
    'FVRCP',
    'FeLV',
  ],
  OTHER: 'Other'
};

const VaccinationFormModal = ({
  open,
  onClose,
  onSubmit,
  vaccination = null,
  petSpecies = null,
  selectedVaccineType = '',
  isLoading = false,
}) => {
  const isEdit = !!vaccination;
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      type: '',
      administeredAt: '',
      expiresAt: '',
      documentUrl: '',
      notes: '',
    },
  });

  // Reset form when vaccination changes or modal opens
  useEffect(() => {
    if (vaccination) {
      reset({
        type: vaccination.type || '',
        administeredAt: vaccination.administeredAt ? new Date(vaccination.administeredAt).toISOString().split('T')[0] : '',
        expiresAt: vaccination.expiresAt ? new Date(vaccination.expiresAt).toISOString().split('T')[0] : '',
        documentUrl: vaccination.documentUrl || '',
        notes: vaccination.notes || '',
      });
    } else if (open) {
      reset({
        type: selectedVaccineType || '',
        administeredAt: '',
        expiresAt: '',
        documentUrl: '',
        notes: '',
      });
    }
  }, [vaccination, open, selectedVaccineType, reset]);

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
  };

  // Get available vaccine types based on pet species
  const getVaccineOptions = () => {
    const options = [];
    if (petSpecies === 'Dog') {
      options.push(...VACCINE_TYPES.DOG);
    } else if (petSpecies === 'Cat') {
      options.push(...VACCINE_TYPES.CAT);
    } else {
      options.push(...VACCINE_TYPES.DOG, ...VACCINE_TYPES.CAT);
    }
    options.push(VACCINE_TYPES.OTHER);
    return [...new Set(options)]; // Remove duplicates
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Vaccination' : 'Add Vaccination'}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Vaccine Type */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Vaccine Type <span className="text-red-500">*</span>
          </label>
          <select
            {...register('type', { required: 'Vaccine type is required' })}
            className={cn(
              'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
              errors.type && 'border-red-500'
            )}
          >
            <option value="">Select vaccine type</option>
            {getVaccineOptions().map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Administered Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('administeredAt', { required: 'Administered date is required' })}
              className={cn(
                'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                errors.administeredAt && 'border-red-500'
              )}
            />
            {errors.administeredAt && (
              <p className="mt-1 text-xs text-red-500">{errors.administeredAt.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Expiration Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('expiresAt', { required: 'Expiration date is required' })}
              className={cn(
                'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
                errors.expiresAt && 'border-red-500'
              )}
            />
            {errors.expiresAt && (
              <p className="mt-1 text-xs text-red-500">{errors.expiresAt.message}</p>
            )}
          </div>
        </div>

        {/* Document URL */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Document URL
          </label>
          <input
            type="url"
            {...register('documentUrl')}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="https://example.com/vaccine-record.pdf"
          />
          <p className="mt-1 text-xs text-muted">
            Optional: Link to vaccine certificate or record
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Additional details about the vaccination..."
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
            {isLoading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Vaccination' : 'Add Vaccination')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default VaccinationFormModal;
