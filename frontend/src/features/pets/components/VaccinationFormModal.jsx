/**
 * Vaccination Form Modal - Phase 9 Enterprise Form System
 * Uses SlideoutPanel for edit/create flows per Phase 15 standards.
 * Token-based styling for consistent theming.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import SlideoutPanel from '@/components/SlideoutPanel';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';

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

  // Common input styles
  const inputStyles = {
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: 'var(--bb-color-border-subtle)',
    color: 'var(--bb-color-text-primary)',
  };

  const inputClass = cn(
    'w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]',
    'text-[var(--bb-font-size-sm,0.875rem)]',
    'focus:outline-none focus:ring-1',
    'transition-colors'
  );

  return (
    <SlideoutPanel
      isOpen={open}
      onClose={onClose}
      title={isEdit ? 'Edit Vaccination' : 'Add Vaccination'}
      description={isEdit ? 'Update vaccination record details.' : 'Add a new vaccination record for this pet.'}
      widthClass="max-w-md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-[var(--bb-space-6,1.5rem)]">
        {/* Vaccine Type */}
        <div className="space-y-[var(--bb-space-2,0.5rem)]">
          <label
            className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Vaccine Type <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <select
            {...register('type', { required: 'Vaccine type is required' })}
            className={inputClass}
            style={{
              ...inputStyles,
              borderColor: errors.type ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
            }}
          >
            <option value="">Select vaccine type</option>
            {getVaccineOptions().map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.type && (
            <p
              className="text-[var(--bb-font-size-xs,0.75rem)]"
              style={{ color: 'var(--bb-color-status-negative)' }}
            >
              {errors.type.message}
            </p>
          )}
        </div>

        {/* Dates */}
        <FormGrid cols={2}>
          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Administered Date <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
            </label>
            <input
              type="date"
              {...register('administeredAt', { required: 'Administered date is required' })}
              className={inputClass}
              style={{
                ...inputStyles,
                borderColor: errors.administeredAt ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
              }}
            />
            {errors.administeredAt && (
              <p
                className="text-[var(--bb-font-size-xs,0.75rem)]"
                style={{ color: 'var(--bb-color-status-negative)' }}
              >
                {errors.administeredAt.message}
              </p>
            )}
          </div>

          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Expiration Date <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
            </label>
            <input
              type="date"
              {...register('expiresAt', { required: 'Expiration date is required' })}
              className={inputClass}
              style={{
                ...inputStyles,
                borderColor: errors.expiresAt ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
              }}
            />
            {errors.expiresAt && (
              <p
                className="text-[var(--bb-font-size-xs,0.75rem)]"
                style={{ color: 'var(--bb-color-status-negative)' }}
              >
                {errors.expiresAt.message}
              </p>
            )}
          </div>
        </FormGrid>

        {/* Document URL */}
        <div className="space-y-[var(--bb-space-2,0.5rem)]">
          <label
            className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Document URL
          </label>
          <input
            type="url"
            {...register('documentUrl')}
            className={inputClass}
            style={inputStyles}
            placeholder="https://example.com/vaccine-record.pdf"
          />
          <p
            className="text-[var(--bb-font-size-xs,0.75rem)]"
            style={{ color: 'var(--bb-color-text-muted)' }}
          >
            Optional: Link to vaccine certificate or record
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-[var(--bb-space-2,0.5rem)]">
          <label
            className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className={cn(inputClass, 'min-h-[6rem] resize-y')}
            style={inputStyles}
            placeholder="Additional details about the vaccination..."
          />
        </div>

        {/* Actions */}
        <FormActions>
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
        </FormActions>
      </form>
    </SlideoutPanel>
  );
};

export default VaccinationFormModal;
