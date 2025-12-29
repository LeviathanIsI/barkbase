/**
 * RenewVaccinationModal - Vaccine Renewal System
 *
 * Creates a new vaccination record and archives the old one.
 * Pre-fills vaccine type from the existing record.
 * Auto-calculates expiration based on vaccine type defaults.
 */

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTimezoneUtils } from '@/lib/timezone';
import SlideoutPanel from '@/components/SlideoutPanel';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { FormActions, FormGrid } from '@/components/ui/FormField';
import { RefreshCw, Calendar, Syringe, AlertCircle } from 'lucide-react';

// Default expiration periods in months by vaccine type
const VACCINE_EXPIRATION_DEFAULTS = {
  Rabies: 12, // 1 year for first dose, 3 years after
  DHPP: 12,
  DAPP: 12,
  Bordetella: 6,
  'Canine Influenza': 12,
  Leptospirosis: 12,
  Lyme: 12,
  FVRCP: 12,
  FeLV: 12,
  Other: 12,
};

const RenewVaccinationModal = ({
  open,
  onClose,
  onSubmit,
  vaccination,
  petName = 'Pet',
  isLoading = false,
}) => {
  const tz = useTimezoneUtils();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      administeredAt: new Date().toISOString().split('T')[0],
      expiresAt: '',
      provider: '',
      lotNumber: '',
      notes: '',
    },
  });

  // Calculate default expiration date based on vaccine type
  const calculateDefaultExpiration = (vaccineType, administeredDate) => {
    const months = VACCINE_EXPIRATION_DEFAULTS[vaccineType] || 12;
    const date = new Date(administeredDate);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  // Reset form when modal opens
  useEffect(() => {
    if (open && vaccination) {
      const today = new Date().toISOString().split('T')[0];
      const defaultExpiration = calculateDefaultExpiration(vaccination.type, today);

      reset({
        administeredAt: today,
        expiresAt: defaultExpiration,
        provider: vaccination.provider || '',
        lotNumber: '',
        notes: '',
      });
    }
  }, [open, vaccination, reset]);

  // Update expiration when administered date changes
  const administeredAt = watch('administeredAt');
  useEffect(() => {
    if (administeredAt && vaccination?.type) {
      const newExpiration = calculateDefaultExpiration(vaccination.type, administeredAt);
      setValue('expiresAt', newExpiration);
    }
  }, [administeredAt, vaccination?.type, setValue]);

  const handleFormSubmit = async (data) => {
    await onSubmit({
      ...data,
      vaccinationId: vaccination?.id || vaccination?.recordId,
      petId: vaccination?.petId,
    });
  };

  // Get status display for the old vaccination
  const getOldVaccinationStatus = () => {
    if (!vaccination?.expiresAt) return null;
    const expiresAt = new Date(vaccination.expiresAt);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { label: 'Expired', variant: 'destructive', days: Math.abs(daysRemaining), isExpired: true };
    } else if (daysRemaining <= 7) {
      return { label: 'Critical', variant: 'warning', days: daysRemaining, isExpired: false };
    } else if (daysRemaining <= 30) {
      return { label: 'Expiring Soon', variant: 'warning', days: daysRemaining, isExpired: false };
    }
    return { label: 'Current', variant: 'success', days: daysRemaining, isExpired: false };
  };

  const oldStatus = getOldVaccinationStatus();

  // Common input styles
  const inputStyles = {
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: 'var(--bb-color-border-subtle)',
    color: 'var(--bb-color-text-primary)',
  };

  const inputClass = cn(
    'w-full rounded-md border px-[var(--bb-space-3,0.75rem)] py-[var(--bb-space-2,0.5rem)]',
    'text-[var(--bb-font-size-sm,0.875rem)]',
    'focus:outline-none focus:ring-1 focus:ring-[var(--bb-color-accent)]',
    'transition-colors'
  );

  if (!vaccination) return null;

  return (
    <SlideoutPanel
      isOpen={open}
      onClose={onClose}
      title="Renew Vaccination"
      description={`Create a new ${vaccination.type} record for ${petName} and archive the old one.`}
      widthClass="max-w-md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-[var(--bb-space-6,1.5rem)]">
        {/* Current Vaccination Info */}
        <div
          className="rounded-lg p-4 space-y-3"
          style={{
            backgroundColor: 'var(--bb-color-bg-elevated)',
            border: '1px solid var(--bb-color-border-subtle)',
          }}
        >
          {/* Pet Name - prominent display */}
          <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <span className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
              {petName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
            <span className="font-medium text-[color:var(--bb-color-text-primary)]">
              {vaccination.type}
            </span>
            {oldStatus && (
              <Badge variant={oldStatus.variant} size="sm">
                {oldStatus.label}
                {oldStatus.days !== undefined && (
                  <span className="ml-1">
                    ({oldStatus.isExpired ? `${oldStatus.days}d ago` : `${oldStatus.days}d left`})
                  </span>
                )}
              </Badge>
            )}
          </div>

          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span style={{ color: 'var(--bb-color-text-muted)' }}>Previous Administration:</span>
              <span style={{ color: 'var(--bb-color-text-primary)' }}>
                {vaccination.administeredAt
                  ? tz.formatShortDate(vaccination.administeredAt)
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--bb-color-text-muted)' }}>Previous Expiration:</span>
              <span style={{ color: 'var(--bb-color-text-primary)' }}>
                {vaccination.expiresAt
                  ? tz.formatShortDate(vaccination.expiresAt)
                  : 'N/A'}
              </span>
            </div>
            {vaccination.provider && (
              <div className="flex justify-between">
                <span style={{ color: 'var(--bb-color-text-muted)' }}>Previous Provider:</span>
                <span style={{ color: 'var(--bb-color-text-primary)' }}>{vaccination.provider}</span>
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-2 text-xs pt-2 border-t"
            style={{
              borderColor: 'var(--bb-color-border-subtle)',
              color: 'var(--bb-color-text-muted)',
            }}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>This record will be archived after renewal</span>
          </div>
        </div>

        {/* New Vaccination Dates */}
        <div className="space-y-4">
          <h3
            className="text-sm font-medium flex items-center gap-2"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            <RefreshCw className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
            New Vaccination Details
          </h3>

          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Administration Date <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="date"
                {...register('administeredAt', { required: 'Administration date is required' })}
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
              <p
                className="text-[var(--bb-font-size-xs,0.75rem)]"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                Auto-calculated based on vaccine type
              </p>
            </div>
          </FormGrid>
        </div>

        {/* Provider */}
        <div className="space-y-[var(--bb-space-2,0.5rem)]">
          <label
            className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Administered By
          </label>
          <input
            type="text"
            {...register('provider')}
            className={inputClass}
            style={inputStyles}
            placeholder="Veterinarian or clinic name"
          />
        </div>

        {/* Lot Number */}
        <div className="space-y-[var(--bb-space-2,0.5rem)]">
          <label
            className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            Lot Number
          </label>
          <input
            type="text"
            {...register('lotNumber')}
            className={inputClass}
            style={inputStyles}
            placeholder="Vaccine lot number (optional)"
          />
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
            className={cn(inputClass, 'min-h-[5rem] resize-y')}
            style={inputStyles}
            placeholder="Additional notes about the vaccination..."
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
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            {isLoading ? 'Renewing...' : 'Renew Vaccination'}
          </Button>
        </FormActions>
      </form>
    </SlideoutPanel>
  );
};

export default RenewVaccinationModal;
