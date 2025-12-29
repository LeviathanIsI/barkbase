/**
 * CheckInSlideoutForm - Check-in form for slideout
 * Allows staff to record check-in details, verify vaccinations, and capture notes
 */

import Button from '@/components/ui/Button';
import { FormActions, FormField, FormGrid, FormSection } from '@/components/ui/FormField';
import { usePetVaccinationsQuery } from '@/features/pets/api';
import { RenewVaccinationModal } from '@/features/pets/components';
import { cn } from '@/lib/cn';
import { canonicalEndpoints } from '@/lib/canonicalEndpoints';
import apiClient from '@/lib/apiClient';
import { useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Dog,
  Loader2,
  Package,
  Phone,
  Scale,
  Syringe,
  User,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { useBookingCheckInMutation, useBookingDetailQuery } from '../api';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  menuList: (base) => ({ ...base, padding: '4px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--bb-color-accent)' : state.isFocused ? 'var(--bb-color-bg-muted)' : 'transparent',
    color: state.isSelected ? 'white' : 'var(--bb-color-text-primary)',
    cursor: 'pointer',
    borderRadius: '0.375rem',
    padding: '8px 12px',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  input: (base) => ({ ...base, color: 'var(--bb-color-text-primary)' }),
  placeholder: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--bb-color-text-muted)' }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-accent)',
    borderRadius: '0.375rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'white',
    padding: '2px 6px',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'rgba(255, 255, 255, 0.7)',
    ':hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      color: 'white',
    },
  }),
};

const appearanceOptions = [
  { value: 'clean', label: 'Clean' },
  { value: 'dirty', label: 'Dirty' },
  { value: 'matted', label: 'Matted Fur' },
  { value: 'shedding', label: 'Shedding' },
  { value: 'fleas', label: 'Fleas/Ticks' },
  { value: 'skin_irritation', label: 'Skin Irritation' },
  { value: 'mange', label: 'Mange' },
  { value: 'eye_discharge', label: 'Eye Discharge' },
  { value: 'ear_infection', label: 'Ear Infection' },
  { value: 'limping', label: 'Limping' },
  { value: 'underweight', label: 'Underweight' },
  { value: 'overweight', label: 'Overweight' },
];

/**
 * Get vaccination status based on expiration date
 */
const getVaccinationStatus = (vaccination) => {
  if (!vaccination.expiresAt) return 'unknown';
  const expiresAt = new Date(vaccination.expiresAt);
  const today = new Date();
  const daysUntilExpiry = differenceInDays(expiresAt, today);

  if (isPast(expiresAt) && !isToday(expiresAt)) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'current';
};

/**
 * Vaccination status badge component
 */
const VaccinationBadge = ({ status }) => {
  const styles = {
    expired: {
      bg: 'var(--bb-color-status-negative-soft, rgba(239, 68, 68, 0.1))',
      text: 'var(--bb-color-status-negative, #ef4444)',
      label: 'Expired',
    },
    expiring: {
      bg: 'var(--bb-color-status-warning-soft, rgba(245, 158, 11, 0.1))',
      text: 'var(--bb-color-status-warning, #f59e0b)',
      label: 'Expiring Soon',
    },
    current: {
      bg: 'var(--bb-color-status-positive-soft, rgba(34, 197, 94, 0.1))',
      text: 'var(--bb-color-status-positive, #22c55e)',
      label: 'Current',
    },
    unknown: {
      bg: 'var(--bb-color-bg-muted)',
      text: 'var(--bb-color-text-muted)',
      label: 'Unknown',
    },
  };

  const style = styles[status] || styles.unknown;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
};

/**
 * Vaccination list item component
 */
const VaccinationItem = ({ vaccination, onRenew }) => {
  const status = getVaccinationStatus(vaccination);
  const showRenew = status === 'expired' || status === 'expiring';
  const expiresAt = vaccination.expiresAt ? new Date(vaccination.expiresAt) : null;

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border"
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            backgroundColor: status === 'expired' ? 'var(--bb-color-status-negative-soft)' :
              status === 'expiring' ? 'var(--bb-color-status-warning-soft)' :
                'var(--bb-color-status-positive-soft)',
            color: status === 'expired' ? 'var(--bb-color-status-negative)' :
              status === 'expiring' ? 'var(--bb-color-status-warning)' :
                'var(--bb-color-status-positive)',
          }}
        >
          <Syringe className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
            {vaccination.type || vaccination.name || 'Unknown Vaccine'}
          </p>
          {expiresAt && (
            <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
              {status === 'expired' ? 'Expired' : 'Expires'}: {format(expiresAt, 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <VaccinationBadge status={status} />
        {showRenew && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onRenew(vaccination)}>
            Renew
          </Button>
        )}
      </div>
    </div>
  );
};

const CheckInSlideoutForm = ({
  bookingId,
  booking: initialBooking,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [vaccinationToRenew, setVaccinationToRenew] = useState(null);
  const [isRenewing, setIsRenewing] = useState(false);

  // Fetch booking details if not provided
  const { data: fetchedBooking, isLoading: bookingLoading } = useBookingDetailQuery(
    bookingId,
    { enabled: !initialBooking && !!bookingId }
  );
  const booking = initialBooking || fetchedBooking;

  // Get pet ID from booking
  const petId = booking?.petId || booking?.pet?.id || booking?.pet?.recordId;
  const petName = booking?.petName || booking?.pet?.name || 'Pet';

  // Fetch vaccinations (filter out archived ones)
  const { data: rawVaccinations = [], isLoading: vaccLoading } = usePetVaccinationsQuery(petId, {
    enabled: !!petId,
  });
  const vaccinations = rawVaccinations.filter(v => !v.archived && v.status !== 'archived');

  // Mutation
  const checkInMutation = useBookingCheckInMutation();

  // Form setup
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      checkInTime: format(new Date(), 'HH:mm'),
      weight: booking?.pet?.weight || '',
      appearance: [{ value: 'clean', label: 'Clean' }],
      vaccinationsVerified: false,
      belongings: '',
      notes: '',
    },
  });

  // Handle vaccination renew - open RenewVaccinationModal
  const handleRenewVaccination = (vaccination) => {
    setVaccinationToRenew(vaccination);
    setRenewModalOpen(true);
  };

  // Handle renew modal close
  const handleRenewCancel = () => {
    setRenewModalOpen(false);
    setVaccinationToRenew(null);
  };

  // Handle renew submission
  const handleRenewSubmit = async (data) => {
    if (!vaccinationToRenew || !petId) return;

    const vaccinationId = vaccinationToRenew.recordId || vaccinationToRenew.id;
    if (!vaccinationId) {
      toast.error('Unable to identify vaccination record');
      return;
    }

    setIsRenewing(true);
    try {
      await apiClient.post(
        canonicalEndpoints.pets.vaccinationRenew(
          String(petId),
          String(vaccinationId)
        ),
        {
          administeredAt: data.administeredAt,
          expiresAt: data.expiresAt,
          provider: data.provider || null,
          lotNumber: data.lotNumber || null,
          notes: data.notes || null,
        }
      );

      toast.success(`${vaccinationToRenew.type} renewed successfully`);
      setRenewModalOpen(false);
      setVaccinationToRenew(null);

      // Refresh the vaccinations data
      queryClient.invalidateQueries({ queryKey: ['petVaccinations'] });
      queryClient.invalidateQueries({ queryKey: ['vaccinations', 'expiring'] });
    } catch (error) {
      console.error('Failed to renew vaccination:', error);
      toast.error(error?.message || 'Failed to renew vaccination');
    } finally {
      setIsRenewing(false);
    }
  };

  // Submit handler
  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await checkInMutation.mutateAsync({
        bookingId,
        payload: {
          weight: data.weight ? parseFloat(data.weight) : undefined,
          appearance: Array.isArray(data.appearance)
            ? data.appearance.map(a => a.value)
            : [],
          vaccinationsVerified: data.vaccinationsVerified,
          belongings: data.belongings || undefined,
          notes: data.notes || undefined,
        },
      });
      toast.success(`${petName} checked in successfully!`);
      onSuccess?.();
    } catch (error) {
      console.error('Check-in failed:', error);
      toast.error(error?.message || 'Failed to check in');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyles = {
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: 'var(--bb-color-border-subtle)',
    color: 'var(--bb-color-text-primary)',
  };

  const inputClass = cn(
    'w-full rounded-md border px-3 py-2 text-sm',
    'focus:outline-none focus:ring-1',
    'transition-colors'
  );

  // Loading state
  if (bookingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--bb-color-accent)' }} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="h-8 w-8" style={{ color: 'var(--bb-color-status-negative)' }} />
        <p style={{ color: 'var(--bb-color-text-muted)' }}>Booking not found</p>
      </div>
    );
  }

  // Extract booking info
  const ownerName = booking.ownerName || booking.owner?.name ||
    (booking.owner?.firstName ? `${booking.owner.firstName} ${booking.owner.lastName || ''}`.trim() : 'Owner');
  const ownerPhone = booking.ownerPhone || booking.owner?.phone;
  const serviceName = booking.serviceName || booking.service?.name || booking.serviceType || 'Service';
  const checkInDate = booking.checkIn || booking.startDate || booking.check_in;
  const checkOutDate = booking.checkOut || booking.endDate || booking.check_out;
  const specialInstructions = booking.specialInstructions || booking.special_instructions || booking.notes;

  // Check for expired/expiring vaccinations
  const expiredCount = vaccinations.filter(v => getVaccinationStatus(v) === 'expired').length;
  const expiringCount = vaccinations.filter(v => getVaccinationStatus(v) === 'expiring').length;

  return (
    <>
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Booking Summary */}
      <FormSection title="Booking Summary">
        <div
          className="rounded-lg border p-4 space-y-4"
          style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-elevated)' }}
        >
          {/* Pet & Owner */}
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full shrink-0"
              style={{ backgroundColor: 'var(--bb-color-accent-soft)', color: 'var(--bb-color-accent)' }}
            >
              <Dog className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg" style={{ color: 'var(--bb-color-text-primary)' }}>
                {petName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                  {ownerName}
                </span>
                {ownerPhone && (
                  <>
                    <span style={{ color: 'var(--bb-color-text-subtle)' }}>|</span>
                    <Phone className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                      {ownerPhone}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Service & Dates */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                Service
              </p>
              <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                {serviceName}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                Dates
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: 'var(--bb-color-text-muted)' }} />
                <span className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                  {checkInDate ? format(new Date(checkInDate), 'MMM d') : 'N/A'}
                  {checkOutDate && checkOutDate !== checkInDate && (
                    <> - {format(new Date(checkOutDate), 'MMM d')}</>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {specialInstructions && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                Special Instructions
              </p>
              <p className="text-sm" style={{ color: 'var(--bb-color-text-primary)' }}>
                {specialInstructions}
              </p>
            </div>
          )}
        </div>
      </FormSection>

      {/* Check-in Time */}
      <FormSection title="Check-in Time">
        <FormGrid cols={2}>
          <FormField label="Date">
            <input
              type="text"
              disabled
              value={format(new Date(), 'EEEE, MMM d, yyyy')}
              className={inputClass}
              style={{ ...inputStyles, opacity: 0.7 }}
            />
          </FormField>
          <FormField label="Actual Time">
            <input
              type="time"
              {...register('checkInTime')}
              className={inputClass}
              style={inputStyles}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Pet Appearance */}
      <FormSection title="Pet Appearance on Arrival">
        <FormGrid cols={2}>
          <FormField label="Weight (lbs)" helpText="Optional - record current weight">
            <input
              type="number"
              step="0.1"
              placeholder="e.g., 45.5"
              {...register('weight')}
              className={inputClass}
              style={inputStyles}
            />
          </FormField>
          <FormField label="Appearance" helpText="Select all that apply">
            <Controller
              name="appearance"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  isMulti
                  options={appearanceOptions}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  placeholder="Select appearance..."
                />
              )}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Vaccinations */}
      <FormSection title="Vaccinations">
        {/* Warning banner if there are issues */}
        {(expiredCount > 0 || expiringCount > 0) && (
          <div
            className="flex items-start gap-3 p-3 rounded-lg mb-4"
            style={{
              backgroundColor: expiredCount > 0 ? 'var(--bb-color-status-negative-soft)' : 'var(--bb-color-status-warning-soft)',
            }}
          >
            <AlertTriangle
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{
                color: expiredCount > 0 ? 'var(--bb-color-status-negative)' : 'var(--bb-color-status-warning)',
              }}
            />
            <div>
              <p
                className="font-medium text-sm"
                style={{
                  color: expiredCount > 0 ? 'var(--bb-color-status-negative)' : 'var(--bb-color-status-warning)',
                }}
              >
                {expiredCount > 0 && `${expiredCount} expired vaccination${expiredCount > 1 ? 's' : ''}`}
                {expiredCount > 0 && expiringCount > 0 && ' and '}
                {expiringCount > 0 && `${expiringCount} expiring soon`}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--bb-color-text-muted)' }}>
                Update records if the owner has brought new documentation
              </p>
            </div>
          </div>
        )}

        {vaccLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--bb-color-text-muted)' }} />
          </div>
        ) : vaccinations.length === 0 ? (
          <p className="text-sm py-4" style={{ color: 'var(--bb-color-text-muted)' }}>
            No vaccination records on file
          </p>
        ) : (
          <div className="space-y-2">
            {vaccinations.map((vax, idx) => (
              <VaccinationItem
                key={vax.id || vax.recordId || idx}
                vaccination={vax}
                onRenew={handleRenewVaccination}
              />
            ))}
          </div>
        )}

        {/* Verification checkbox */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
          <input
            type="checkbox"
            id="vaccinationsVerified"
            {...register('vaccinationsVerified')}
            className="h-4 w-4 rounded border-gray-300"
            style={{ accentColor: 'var(--bb-color-accent)' }}
          />
          <label
            htmlFor="vaccinationsVerified"
            className="text-sm"
            style={{ color: 'var(--bb-color-text-primary)' }}
          >
            I have verified all vaccination records are up to date
          </label>
        </div>
      </FormSection>

      {/* Belongings */}
      <FormSection title="Belongings Dropped Off">
        <FormField helpText="List any items the owner is leaving (food, toys, medications, bed, etc.)">
          <textarea
            {...register('belongings')}
            rows={3}
            placeholder="e.g., Blue food bowl, Chicken kibble (2 cups/day), Squeaky toy, Anxiety medication (give with dinner)"
            className={inputClass}
            style={inputStyles}
          />
        </FormField>
      </FormSection>

      {/* Staff Notes */}
      <FormSection title="Staff Notes">
        <FormField helpText="Any observations or important notes about the pet at check-in">
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="e.g., Seemed nervous, owner mentioned doesn't get along with large dogs, slight limp on back left leg"
            className={inputClass}
            style={inputStyles}
          />
        </FormField>
      </FormSection>

      {/* Actions */}
      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Checking In...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Check-In
            </>
          )}
        </Button>
      </FormActions>
    </form>

    {/* Renew Vaccination Modal */}
    <RenewVaccinationModal
      open={renewModalOpen}
      onClose={handleRenewCancel}
      onSubmit={handleRenewSubmit}
      vaccination={vaccinationToRenew}
      petName={petName}
      isLoading={isRenewing}
    />
    </>
  );
};

export default CheckInSlideoutForm;
