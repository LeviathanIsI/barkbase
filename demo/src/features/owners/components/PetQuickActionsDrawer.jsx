/**
 * PetQuickActionsDrawer - Quick actions drawer for a pet
 * Opens from hover card, shows pet details and inline action forms
 * All actions happen within the drawer - no navigation or external modals
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import {
  X, PawPrint, Calendar, Syringe, Bell, ArrowLeft,
  User, Scale, Cake, Check, AlertTriangle,
  Loader2, Clock, Send, CheckCircle,
} from 'lucide-react';
import { format, differenceInYears, differenceInMonths, addDays } from 'date-fns';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { usePetQuery } from '@/features/pets/api';
import { useBookingsQuery, useCreateBookingMutation } from '@/features/bookings/api';
import { useCreateVaccinationMutation } from '@/features/pets/api';
import { useSendMessageMutation } from '@/features/messaging/api';
import { useServicesQuery } from '@/features/services/api';
import toast from 'react-hot-toast';

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
};

// Common vaccine types
const VACCINE_TYPES = [
  'Rabies',
  'DAPP',
  'DHPP',
  'Bordetella',
  'Leptospirosis',
  'Influenza',
  'FVRCP',
  'FeLV',
];

/**
 * Calculate age from date of birth
 */
const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const years = differenceInYears(new Date(), birthDate);
  if (years > 0) return `${years} year${years !== 1 ? 's' : ''}`;
  const months = differenceInMonths(new Date(), birthDate);
  return `${months} month${months !== 1 ? 's' : ''}`;
};

/**
 * Format weight with unit
 */
const formatWeight = (weight) => {
  if (!weight) return null;
  return `${weight} lbs`;
};

// Panel types for navigation
const PANELS = {
  MAIN: 'main',
  BOOKING: 'booking',
  VACCINATION: 'vaccination',
  REMINDER: 'reminder',
};

const PetQuickActionsDrawer = ({ petId, isOpen, onClose }) => {
  const [activePanel, setActivePanel] = useState(PANELS.MAIN);

  // Fetch pet details
  const { data: pet, isLoading: petLoading } = usePetQuery(petId, {
    enabled: isOpen && !!petId,
  });

  // Fetch recent bookings for this pet
  const { data: bookingsData } = useBookingsQuery({
    petId,
    limit: 5,
  });
  const recentBookings = bookingsData?.slice?.(0, 5) || [];

  // Pet info
  const petName = pet?.name || 'Loading...';
  const species = pet?.species?.toUpperCase() || '';
  const breed = pet?.breed || '';
  const speciesBreed = [species, breed].filter(Boolean).join(' - ') || 'Unknown';
  const isActive = pet?.status === 'active' || pet?.status === 'ACTIVE' || pet?.is_active !== false;
  const age = calculateAge(pet?.date_of_birth || pet?.birthdate || pet?.dateOfBirth);
  const weight = formatWeight(pet?.weight);

  // Owner info
  const ownerName = pet?.owner_first_name && pet?.owner_last_name
    ? `${pet.owner_first_name} ${pet.owner_last_name}`
    : pet?.owners?.[0]?.firstName && pet?.owners?.[0]?.lastName
      ? `${pet.owners[0].firstName} ${pet.owners[0].lastName}`
      : null;
  const ownerId = pet?.owner_id || pet?.owners?.[0]?.id || pet?.owners?.[0]?.recordId;

  // Vaccination status
  const hasVaccinationIssue = pet?.vaccinationStatus === 'expiring' ||
    pet?.vaccinationStatus === 'missing' ||
    pet?.hasExpiringVaccinations === true;

  // Handle panel back navigation
  const handleBack = () => {
    setActivePanel(PANELS.MAIN);
  };

  // Handle close - reset panel state
  const handleClose = () => {
    setActivePanel(PANELS.MAIN);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0 duration-200"
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md z-50',
          'animate-in slide-in-from-right duration-300',
          'flex flex-col'
        )}
        style={{
          backgroundColor: 'var(--bb-color-bg-body)',
          borderLeft: '1px solid var(--bb-color-border-subtle)',
        }}
      >
        {/* Header */}
        <DrawerHeader
          pet={pet}
          petName={petName}
          speciesBreed={speciesBreed}
          isActive={isActive}
          activePanel={activePanel}
          onBack={handleBack}
          onClose={handleClose}
        />

        {/* Content - Panel based */}
        <div className="flex-1 overflow-y-auto">
          {petLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[color:var(--bb-color-text-muted)]" />
            </div>
          ) : (
            <>
              {activePanel === PANELS.MAIN && (
                <MainPanel
                  pet={pet}
                  ownerName={ownerName}
                  age={age}
                  weight={weight}
                  hasVaccinationIssue={hasVaccinationIssue}
                  recentBookings={recentBookings}
                  onActionClick={setActivePanel}
                />
              )}
              {activePanel === PANELS.BOOKING && (
                <BookingPanel
                  pet={pet}
                  ownerId={ownerId}
                  onBack={handleBack}
                  onSuccess={() => {
                    toast.success('Booking created successfully');
                    handleBack();
                  }}
                />
              )}
              {activePanel === PANELS.VACCINATION && (
                <VaccinationPanel
                  pet={pet}
                  petId={petId}
                  species={species}
                  onBack={handleBack}
                  onSuccess={() => {
                    toast.success('Vaccination added successfully');
                    handleBack();
                  }}
                />
              )}
              {activePanel === PANELS.REMINDER && (
                <ReminderPanel
                  pet={pet}
                  petName={petName}
                  ownerId={ownerId}
                  onBack={handleBack}
                  onSuccess={() => {
                    toast.success('Reminder sent successfully');
                    handleBack();
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

/**
 * Drawer header component
 */
const DrawerHeader = ({ pet, petName, speciesBreed, isActive, activePanel, onBack, onClose }) => {
  const getPanelTitle = () => {
    switch (activePanel) {
      case PANELS.BOOKING: return 'New Booking';
      case PANELS.VACCINATION: return 'Add Vaccination';
      case PANELS.REMINDER: return 'Send Reminder';
      default: return null;
    }
  };

  const panelTitle = getPanelTitle();

  return (
    <div
      className="flex items-start justify-between p-4 border-b"
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-3">
        {activePanel !== PANELS.MAIN ? (
          <>
            <button
              onClick={onBack}
              className="p-1 rounded hover:bg-[var(--bb-color-bg-elevated)] transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                {panelTitle}
              </h2>
              <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                for {petName}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Pet Avatar */}
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold"
              style={{
                backgroundColor: 'var(--bb-color-bg-elevated)',
                color: 'var(--bb-color-text-muted)',
              }}
            >
              {pet?.name?.[0]?.toUpperCase() || <PawPrint className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                  {petName}
                </h2>
                <Badge variant={isActive ? 'success' : 'neutral'} className="text-xs">
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                {speciesBreed}
              </p>
            </div>
          </>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-[var(--bb-color-bg-elevated)] transition-colors"
      >
        <X className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
      </button>
    </div>
  );
};

/**
 * Main panel - shows pet info and action buttons
 */
const MainPanel = ({ pet, ownerName, age, weight, hasVaccinationIssue, recentBookings, onActionClick }) => (
  <div className="p-4 space-y-6">
    {/* Quick Info */}
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[color:var(--bb-color-text-muted)]">
        Quick Info
      </h3>
      <div className="space-y-2">
        {ownerName && (
          <InfoRow icon={User} label="Owner" value={ownerName} />
        )}
        {age && (
          <InfoRow icon={Cake} label="Age" value={age} />
        )}
        {weight && (
          <InfoRow icon={Scale} label="Weight" value={weight} />
        )}
        <InfoRow
          icon={hasVaccinationIssue ? AlertTriangle : Check}
          iconColor={hasVaccinationIssue ? 'text-amber-500' : 'text-emerald-500'}
          label="Vaccinations"
          value={hasVaccinationIssue ? 'Needs attention' : 'Up to date'}
        />
      </div>
    </section>

    {/* Quick Actions */}
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[color:var(--bb-color-text-muted)]">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={Calendar}
          label="New Booking"
          onClick={() => onActionClick(PANELS.BOOKING)}
        />
        <ActionButton
          icon={Syringe}
          label="Add Vaccination"
          onClick={() => onActionClick(PANELS.VACCINATION)}
        />
        <ActionButton
          icon={Bell}
          label="Send Reminder"
          onClick={() => onActionClick(PANELS.REMINDER)}
        />
      </div>
    </section>

    {/* Recent Bookings */}
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 text-[color:var(--bb-color-text-muted)]">
        Recent Bookings
      </h3>
      {recentBookings.length > 0 ? (
        <div className="space-y-2">
          {recentBookings.map((booking) => (
            <BookingRow key={booking.id || booking.recordId} booking={booking} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--bb-color-text-muted)] py-2">
          No recent bookings
        </p>
      )}
    </section>
  </div>
);

/**
 * Booking panel - inline booking form
 */
const BookingPanel = ({ pet, ownerId, onBack, onSuccess }) => {
  const { data: servicesData } = useServicesQuery();
  const services = servicesData?.services || servicesData || [];
  const createMutation = useCreateBookingMutation();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      checkIn: format(new Date(), 'yyyy-MM-dd'),
      checkOut: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      serviceId: '',
      specialRequirements: '',
    },
  });

  const onSubmit = async (data) => {
    if (!data.serviceId) {
      toast.error('Please select a service');
      return;
    }

    try {
      await createMutation.mutateAsync({
        ownerId: ownerId,
        petId: pet?.recordId || pet?.id,
        serviceId: data.serviceId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        specialRequirements: data.specialRequirements,
        status: 'PENDING',
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to create booking:', error);
      toast.error(error?.message || 'Failed to create booking');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
      {/* Service */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Service <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
        </label>
        <Select
          options={services.map(service => ({
            value: service.recordId || service.id,
            label: `${service.name}${service.priceCents ? ` - $${(service.priceCents / 100).toFixed(2)}/day` : ''}`
          }))}
          value={services.map(service => ({
            value: service.recordId || service.id,
            label: `${service.name}${service.priceCents ? ` - $${(service.priceCents / 100).toFixed(2)}/day` : ''}`
          })).find(o => o.value === watch('serviceId')) || null}
          onChange={(opt) => setValue('serviceId', opt?.value || '', { shouldDirty: true })}
          placeholder="Select a service"
          isClearable={false}
          isSearchable
          styles={selectStyles}
          menuPortalTarget={document.body}
        />
        {errors.serviceId && (
          <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.serviceId.message}</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Check-in <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <input
            type="date"
            {...register('checkIn', { required: 'Check-in date is required' })}
            className={inputClass}
            style={inputStyles}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Check-out <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <input
            type="date"
            {...register('checkOut', { required: 'Check-out date is required' })}
            className={inputClass}
            style={inputStyles}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Special Requirements
        </label>
        <textarea
          {...register('specialRequirements')}
          rows={3}
          className={cn(inputClass, 'resize-y')}
          style={inputStyles}
          placeholder="Medications, feeding instructions, special handling..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Create Booking
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

/**
 * Vaccination panel - inline vaccination form
 */
const VaccinationPanel = ({ pet, petId, species, onBack, onSuccess }) => {
  const createMutation = useCreateVaccinationMutation(petId);

  // Filter vaccine types by species
  const vaccineOptions = VACCINE_TYPES.filter(type => {
    const dogVaccines = ['DAPP', 'DHPP', 'Bordetella', 'Leptospirosis', 'Influenza'];
    const catVaccines = ['FVRCP', 'FeLV'];

    if (species?.toLowerCase() === 'cat') {
      return !dogVaccines.includes(type);
    }
    if (species?.toLowerCase() === 'dog') {
      return !catVaccines.includes(type);
    }
    return true; // Show all if species unknown
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      vaccineType: '',
      dateAdministered: format(new Date(), 'yyyy-MM-dd'),
      expirationDate: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
      veterinarian: '',
      notes: '',
    },
  });

  const onSubmit = async (data) => {
    if (!data.vaccineType) {
      toast.error('Please select a vaccine type');
      return;
    }

    try {
      await createMutation.mutateAsync({
        vaccineType: data.vaccineType,
        dateAdministered: data.dateAdministered,
        expirationDate: data.expirationDate,
        veterinarian: data.veterinarian || null,
        notes: data.notes || null,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add vaccination:', error);
      toast.error(error?.message || 'Failed to add vaccination');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
      {/* Vaccine Type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Vaccine Type <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
        </label>
        <Select
          options={[
            ...vaccineOptions.map(type => ({ value: type, label: type })),
            { value: 'Other', label: 'Other' }
          ]}
          value={[...vaccineOptions.map(type => ({ value: type, label: type })), { value: 'Other', label: 'Other' }].find(o => o.value === watch('vaccineType')) || null}
          onChange={(opt) => setValue('vaccineType', opt?.value || '', { shouldDirty: true })}
          placeholder="Select a vaccine"
          isClearable={false}
          isSearchable
          styles={selectStyles}
          menuPortalTarget={document.body}
        />
        {errors.vaccineType && (
          <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.vaccineType.message}</p>
        )}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Date Administered <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <input
            type="date"
            {...register('dateAdministered', { required: 'Date is required' })}
            className={inputClass}
            style={inputStyles}
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Expiration Date <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <input
            type="date"
            {...register('expirationDate', { required: 'Expiration date is required' })}
            className={inputClass}
            style={inputStyles}
          />
        </div>
      </div>

      {/* Veterinarian */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Veterinarian / Clinic
        </label>
        <input
          type="text"
          {...register('veterinarian')}
          className={inputClass}
          style={inputStyles}
          placeholder="e.g., Dr. Smith at ABC Vet Clinic"
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Notes
        </label>
        <textarea
          {...register('notes')}
          rows={2}
          className={cn(inputClass, 'resize-y')}
          style={inputStyles}
          placeholder="Any additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Syringe className="h-4 w-4 mr-2" />
              Add Vaccination
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

/**
 * Reminder panel - inline message form
 */
const ReminderPanel = ({ pet, petName, ownerId, onBack, onSuccess }) => {
  const sendMutation = useSendMessageMutation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      subject: `Reminder for ${petName}`,
      message: '',
    },
  });

  const onSubmit = async (data) => {
    if (!data.message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      await sendMutation.mutateAsync({
        ownerId: ownerId,
        petId: pet?.recordId || pet?.id,
        subject: data.subject,
        content: data.message,
        type: 'REMINDER',
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to send reminder:', error);
      toast.error(error?.message || 'Failed to send reminder');
    }
  };

  // Quick message templates
  const templates = [
    { label: 'Vaccination Due', text: `Hi! This is a friendly reminder that ${petName}'s vaccinations are due for renewal. Please contact us to schedule an update.` },
    { label: 'Upcoming Booking', text: `Just a reminder about your upcoming booking for ${petName}. Please let us know if you have any questions or need to make changes.` },
    { label: 'General Check-in', text: `We wanted to check in and see how ${petName} is doing! Feel free to reach out if you need anything.` },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
      {/* Quick Templates */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Quick Templates
        </label>
        <div className="flex flex-wrap gap-2">
          {templates.map((template, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setValue('message', template.text)}
              className="px-2 py-1 text-xs rounded border transition-colors hover:bg-[var(--bb-color-bg-surface)]"
              style={{ borderColor: 'var(--bb-color-border-subtle)', color: 'var(--bb-color-text-primary)' }}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Subject
        </label>
        <input
          type="text"
          {...register('subject')}
          className={inputClass}
          style={inputStyles}
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Message <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
        </label>
        <textarea
          {...register('message', { required: 'Message is required' })}
          rows={5}
          className={cn(inputClass, 'resize-y')}
          style={inputStyles}
          placeholder="Type your message here..."
        />
        {errors.message && (
          <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.message.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Reminder
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

/**
 * Info row component
 */
const InfoRow = ({ icon: Icon, iconColor, label, value }) => (
  <div className="flex items-center gap-3 py-1.5">
    <Icon className={cn('h-4 w-4', iconColor || 'text-[color:var(--bb-color-text-muted)]')} />
    <span className="text-sm text-[color:var(--bb-color-text-muted)]">{label}</span>
    <span className="text-sm ml-auto text-[color:var(--bb-color-text-primary)]">
      {value}
    </span>
  </div>
);

/**
 * Action button component
 */
const ActionButton = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors border-[var(--bb-color-border-subtle)] hover:bg-[var(--bb-color-bg-surface)]"
    style={{ color: 'var(--bb-color-text-primary)' }}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

/**
 * Booking row component
 */
const BookingRow = ({ booking }) => {
  const checkIn = booking.checkIn || booking.startDate || booking.check_in;
  const status = booking.status || 'PENDING';

  const statusVariants = {
    PENDING: 'neutral',
    CONFIRMED: 'info',
    CHECKED_IN: 'success',
    CHECKED_OUT: 'neutral',
    CANCELLED: 'danger',
    NO_SHOW: 'warning',
  };

  return (
    <div
      className="flex items-center justify-between py-2 px-2 rounded hover:bg-[var(--bb-color-bg-surface)] transition-colors"
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
        <span className="text-sm text-[color:var(--bb-color-text-primary)]">
          {checkIn ? format(new Date(checkIn), 'MMM d, yyyy') : 'No date'}
        </span>
      </div>
      <Badge variant={statusVariants[status] || 'neutral'} className="text-xs">
        {status.replace('_', ' ')}
      </Badge>
    </div>
  );
};

// Shared styles
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

export default PetQuickActionsDrawer;
