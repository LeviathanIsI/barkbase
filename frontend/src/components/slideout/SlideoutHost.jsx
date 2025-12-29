/**
 * SlideoutHost - Renders the active slideout panel
 * Place this once in the app layout to enable global slideouts
 */

import SlideoutPanel from '@/components/SlideoutPanel';
import Button from '@/components/ui/Button';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';
import { cn } from '@/lib/cn';
import { useTenantStore } from '@/stores/tenant';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { SLIDEOUT_TYPES, useSlideout } from './SlideoutProvider';

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

// API hooks
import { useCreateCommunicationMutation, useCreateNote } from '@/features/communications/api';
import { useSendMessageMutation } from '@/features/messaging/api';
import { useCreateOwnerMutation, useOwner, useOwnersQuery, useUpdateOwnerMutation } from '@/features/owners/api';
import { useCreatePetMutation, useUpdatePetMutation, useUpdateVaccinationMutation } from '@/features/pets/api';
import { addDays, format } from 'date-fns';

// Form components for complex flows
import LogActivityForm from '@/features/activities/components/LogActivityForm';
import BookingSlideoutForm from '@/features/bookings/components/BookingSlideoutForm';
import CheckInSlideoutForm from '@/features/bookings/components/CheckInSlideoutForm';
import CommunicationSlideoutForm from '@/features/communications/components/CommunicationSlideoutForm';
import TaskSlideoutForm from '@/features/tasks/components/TaskSlideoutForm';

/**
 * SlideoutHost component
 * Renders the appropriate form based on slideout state
 */
export function SlideoutHost() {
  const { state, isOpen, closeSlideout, handleSuccess, hasBackAction, goBack, previousSlideoutLabel } = useSlideout();
  const queryClient = useQueryClient();
  const tenantId = useTenantStore((s) => s.tenant?.recordId ?? 'unknown');

  // Get query invalidation keys based on slideout type
  const getInvalidationKeys = (type, result) => {
    switch (type) {
      case SLIDEOUT_TYPES.PET_CREATE:
      case SLIDEOUT_TYPES.PET_EDIT:
        return [
          ['pets', { tenantId }],
          result?.recordId ? ['pets', { tenantId }, result.recordId] : null,
          result?.ownerId ? ['owner', result.ownerId] : null,
        ].filter(Boolean);
      
      case SLIDEOUT_TYPES.OWNER_CREATE:
      case SLIDEOUT_TYPES.OWNER_EDIT:
        return [
          ['owners', { tenantId }],
          result?.recordId ? ['owner', result.recordId] : null,
        ].filter(Boolean);
      
      case SLIDEOUT_TYPES.BOOKING_CREATE:
      case SLIDEOUT_TYPES.BOOKING_EDIT:
        return [
          ['bookings'],
          ['dashboard'],
          result?.ownerId ? ['owner', result.ownerId] : null,
          result?.petId ? ['pets', { tenantId }, result.petId] : null,
        ].filter(Boolean);
      
      case SLIDEOUT_TYPES.TASK_CREATE:
      case SLIDEOUT_TYPES.TASK_EDIT:
        return [['tasks'], ['dashboard']];
      
      case SLIDEOUT_TYPES.COMMUNICATION_CREATE:
      case SLIDEOUT_TYPES.NOTE_CREATE:
      case SLIDEOUT_TYPES.ACTIVITY_LOG:
        return [
          ['communications'],
          state?.props?.ownerId ? ['owner', state.props.ownerId] : null,
          state?.props?.ownerId ? ['customerTimeline', state.props.ownerId] : null,
          ['notes'],
          ['activities'],
        ].filter(Boolean);

      case SLIDEOUT_TYPES.MESSAGE_CREATE:
        return [
          ['messages', 'conversations'],
          ['messages'],
        ];

      case SLIDEOUT_TYPES.SEND_RECEIPT:
        return [
          ['communications'],
          state?.props?.ownerId ? ['owner', state.props.ownerId] : null,
        ].filter(Boolean);

      case SLIDEOUT_TYPES.VACCINATION_EDIT:
        return [
          ['petVaccinations', { tenantId, petId: state?.props?.petId }],
          ['vaccinations'],
          ['vaccinations', 'expiring'],
          state?.props?.petId ? ['pets', { tenantId }, state.props.petId] : null,
        ].filter(Boolean);

      case SLIDEOUT_TYPES.BOOKING_CHECK_IN:
        return [
          ['bookings'],
          ['calendar'],
          ['dashboard'],
          ['vaccinations', 'expiring'],
          state?.props?.bookingId ? ['bookings', state.props.bookingId] : null,
        ].filter(Boolean);

      default:
        return [];
    }
  };

  // Handle form success with automatic query invalidation
  const onFormSuccess = (result) => {
    const invalidationKeys = getInvalidationKeys(state?.type, result);
    handleSuccess(result, { 
      invalidate: invalidationKeys,
      onSuccess: state?.props?.onSuccess,
    });
    toast.success(getSuccessMessage(state?.type));
  };

  // Get success message based on type
  const getSuccessMessage = (type) => {
    switch (type) {
      case SLIDEOUT_TYPES.PET_CREATE: return 'Pet created successfully';
      case SLIDEOUT_TYPES.PET_EDIT: return 'Pet updated successfully';
      case SLIDEOUT_TYPES.OWNER_CREATE: return 'Customer created successfully';
      case SLIDEOUT_TYPES.OWNER_EDIT: return 'Customer updated successfully';
      case SLIDEOUT_TYPES.BOOKING_CREATE: return 'Booking created successfully';
      case SLIDEOUT_TYPES.BOOKING_EDIT: return 'Booking updated successfully';
      case SLIDEOUT_TYPES.TASK_CREATE: return 'Task created successfully';
      case SLIDEOUT_TYPES.TASK_EDIT: return 'Task updated successfully';
      case SLIDEOUT_TYPES.COMMUNICATION_CREATE: return 'Message sent successfully';
      case SLIDEOUT_TYPES.MESSAGE_CREATE: return 'Conversation started';
      case SLIDEOUT_TYPES.SEND_RECEIPT: return 'Receipt sent successfully';
      case SLIDEOUT_TYPES.NOTE_CREATE: return 'Note added successfully';
      case SLIDEOUT_TYPES.ACTIVITY_LOG: return 'Activity logged successfully';
      case SLIDEOUT_TYPES.VACCINATION_EDIT: return 'Vaccination updated successfully';
      case SLIDEOUT_TYPES.BOOKING_CHECK_IN: return 'Pet checked in successfully';
      default: return 'Saved successfully';
    }
  };

  // Render the appropriate content based on slideout type
  const renderContent = () => {
    if (!state) return null;

    const { type, props } = state;

    switch (type) {
      case SLIDEOUT_TYPES.PET_CREATE:
        return (
          <PetForm
            pet={null}
            ownerId={props?.ownerId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );
      
      case SLIDEOUT_TYPES.PET_EDIT:
        return (
          <PetForm
            pet={props?.pet}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.OWNER_CREATE:
        return (
          <OwnerForm
            owner={null}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );
      
      case SLIDEOUT_TYPES.OWNER_EDIT:
        return (
          <OwnerForm
            owner={props?.owner}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.BOOKING_CREATE:
        return (
          <BookingSlideoutForm
            mode="create"
            initialPetId={props?.petId}
            initialOwnerId={props?.ownerId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );
      
      case SLIDEOUT_TYPES.BOOKING_EDIT:
        return (
          <BookingSlideoutForm
            mode="edit"
            bookingId={props?.bookingId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.BOOKING_CHECK_IN:
        return (
          <CheckInSlideoutForm
            bookingId={props?.bookingId}
            booking={props?.booking}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.TASK_CREATE:
        return (
          <TaskSlideoutForm
            mode="create"
            petId={props?.petId}
            bookingId={props?.bookingId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );
      
      case SLIDEOUT_TYPES.TASK_EDIT:
        return (
          <TaskSlideoutForm
            mode="edit"
            taskId={props?.taskId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.COMMUNICATION_CREATE:
        return (
          <CommunicationSlideoutForm
            ownerId={props?.ownerId}
            petId={props?.petId}
            bookingId={props?.bookingId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.MESSAGE_CREATE:
        return (
          <NewConversationForm
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.SEND_RECEIPT:
        return (
          <SendReceiptForm
            ownerId={props?.ownerId}
            payment={props?.payment}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.NOTE_CREATE:
        return (
          <NoteForm
            ownerId={props?.ownerId}
            petId={props?.petId}
            bookingId={props?.bookingId}
            paymentId={props?.paymentId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.ACTIVITY_LOG:
        return (
          <LogActivityForm
            entityType={props?.entityType || (props?.ownerId ? 'owner' : props?.petId ? 'pet' : 'booking')}
            entityId={props?.entityId || props?.ownerId || props?.petId || props?.bookingId}
            defaultEmail={props?.defaultEmail}
            defaultPhone={props?.defaultPhone}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.VACCINATION_EDIT:
        return (
          <VaccinationEditForm
            vaccinations={props?.vaccinations || (props?.vaccination ? [props.vaccination] : [])}
            initialIndex={props?.initialIndex || 0}
            petId={props?.petId}
            petName={props?.petName}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      default:
        return (
          <div className="text-center py-12 text-[color:var(--bb-color-text-muted)]">
            Unknown slideout type: {type}
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <SlideoutPanel
      isOpen={isOpen}
      onClose={closeSlideout}
      onBack={hasBackAction ? goBack : undefined}
      backLabel={previousSlideoutLabel}
      title={state?.title}
      description={state?.description}
      widthClass={state?.width}
    >
      {renderContent()}
    </SlideoutPanel>
  );
}

// ============================================================================
// INLINE FORM COMPONENTS
// ============================================================================

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

// Pet Form
function PetForm({ pet, ownerId, onSuccess, onCancel }) {
  const isEdit = !!pet;
  const createMutation = useCreatePetMutation();
  const updateMutation = useUpdatePetMutation(pet?.recordId);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      species: '',
      breed: '',
      weight: '',
      medicalNotes: '',
      dietaryNotes: '',
    },
  });

  useEffect(() => {
    if (pet) {
      reset({
        name: pet.name || '',
        species: pet.species || '',
        breed: pet.breed || '',
        weight: pet.weight || '',
        medicalNotes: pet.medicalNotes || '',
        dietaryNotes: pet.dietaryNotes || '',
      });
    }
  }, [pet, reset]);

  const onSubmit = async (data) => {
    try {
      let result;
      const payload = ownerId ? { ...data, ownerId } : data;
      
      if (isEdit) {
        result = await updateMutation.mutateAsync(payload);
      } else {
        result = await createMutation.mutateAsync(payload);
      }
      onSuccess?.(result || payload);
    } catch (error) {
      console.error('Failed to save pet:', error);
      toast.error(error?.message || 'Failed to save pet');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection title="Basic Information">
        <FormGrid cols={2}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Name <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
            </label>
            <input
              type="text"
              {...register('name', { required: 'Pet name is required' })}
              className={inputClass}
              style={{ ...inputStyles, borderColor: errors.name ? 'var(--bb-color-status-negative)' : inputStyles.borderColor }}
              placeholder="Buddy"
            />
            {errors.name && <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>Breed</label>
            <input type="text" {...register('breed')} className={inputClass} style={inputStyles} placeholder="Golden Retriever" />
          </div>
        </FormGrid>
        <FormGrid cols={2}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>Species</label>
            <Controller
              name="species"
              control={control}
              render={({ field }) => (
                <Select
                  options={[
                    { value: 'Dog', label: 'Dog' },
                    { value: 'Cat', label: 'Cat' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  value={[
                    { value: 'Dog', label: 'Dog' },
                    { value: 'Cat', label: 'Cat' },
                    { value: 'Other', label: 'Other' },
                  ].find(o => o.value === field.value) || null}
                  onChange={(opt) => field.onChange(opt?.value || '')}
                  placeholder="Select species"
                  isClearable
                  isSearchable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>Weight (lbs)</label>
            <input type="number" step="0.1" {...register('weight')} className={inputClass} style={inputStyles} placeholder="25.5" />
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Health Information">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>Medical Notes</label>
          <textarea {...register('medicalNotes')} rows={3} className={cn(inputClass, 'resize-y')} style={inputStyles} placeholder="Medical conditions, medications..." />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>Dietary Notes</label>
          <textarea {...register('dietaryNotes')} rows={3} className={cn(inputClass, 'resize-y')} style={inputStyles} placeholder="Food preferences, restrictions..." />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading || (!isDirty && isEdit)}>
          {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Pet' : 'Create Pet')}
        </Button>
      </FormActions>
    </form>
  );
}

// Owner Form
function OwnerForm({ owner, onSuccess, onCancel }) {
  const isEdit = !!owner;
  const createMutation = useCreateOwnerMutation();
  const updateMutation = useUpdateOwnerMutation(owner?.recordId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (owner) {
      reset({
        firstName: owner.firstName || '',
        lastName: owner.lastName || '',
        email: owner.email || '',
        phone: owner.phone || '',
      });
    }
  }, [owner, reset]);

  const onSubmit = async (data) => {
    try {
      let result;
      if (isEdit) {
        result = await updateMutation.mutateAsync(data);
      } else {
        result = await createMutation.mutateAsync(data);
      }
      onSuccess?.(result || data);
    } catch (error) {
      console.error('Failed to save customer:', error);
      toast.error(error?.message || 'Failed to save customer');
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormSection title="Personal Information">
        <FormGrid cols={2}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              First Name <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
            </label>
            <input
              type="text"
              {...register('firstName', { required: 'First name is required' })}
              className={inputClass}
              style={{ ...inputStyles, borderColor: errors.firstName ? 'var(--bb-color-status-negative)' : inputStyles.borderColor }}
              placeholder="John"
            />
            {errors.firstName && <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Last Name <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
            </label>
            <input
              type="text"
              {...register('lastName', { required: 'Last name is required' })}
              className={inputClass}
              style={{ ...inputStyles, borderColor: errors.lastName ? 'var(--bb-color-status-negative)' : inputStyles.borderColor }}
              placeholder="Doe"
            />
            {errors.lastName && <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.lastName.message}</p>}
          </div>
        </FormGrid>
      </FormSection>

      <FormSection title="Contact Information">
        <FormGrid cols={2}>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>Email</label>
            <input type="email" {...register('email')} className={inputClass} style={inputStyles} placeholder="john@example.com" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>Phone</label>
            <input type="tel" {...register('phone')} className={inputClass} style={inputStyles} placeholder="(555) 123-4567" />
          </div>
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading || (!isDirty && isEdit)}>
          {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Customer' : 'Create Customer')}
        </Button>
      </FormActions>
    </form>
  );
}

// Note Form
function NoteForm({ ownerId, petId, bookingId, paymentId, onSuccess, onCancel }) {
  const createMutation = useCreateNote();
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Determine entity type and ID
    let entityType, entityId;
    if (ownerId) {
      entityType = 'owner';
      entityId = ownerId;
    } else if (petId) {
      entityType = 'pet';
      entityId = petId;
    } else if (bookingId) {
      entityType = 'booking';
      entityId = bookingId;
    } else if (paymentId) {
      entityType = 'payment';
      entityId = paymentId;
    }

    if (!entityType || !entityId) {
      console.error('[NoteForm] Missing entity info - cannot proceed');
      toast.error('Missing entity information');
      return;
    }

    const payload = {
      entityType,
      entityId,
      type: 'general',
      content,
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      onSuccess?.(result);
    } catch (error) {
      console.error('[NoteForm] Error:', error);
      console.error('[NoteForm] Error response:', error?.response?.data);
      toast.error(error?.message || 'Failed to add note');
    }
  };

  const isLoading = createMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
          Note
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className={cn(inputClass, 'resize-y')}
          style={inputStyles}
          placeholder="Type your note here..."
        />
      </div>
      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading || !content.trim()}>
          {isLoading ? 'Adding...' : 'Add Note'}
        </Button>
      </FormActions>
    </form>
  );
}


// Vaccination Edit Form with navigation between multiple vaccinations
function VaccinationEditForm({ vaccinations = [], initialIndex = 0, petId, petName, onSuccess, onCancel }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [updatedIndices, setUpdatedIndices] = useState(new Set());
  const updateMutation = useUpdateVaccinationMutation(petId);

  // Get current vaccination
  const vaccination = vaccinations[currentIndex];
  const totalCount = vaccinations.length;
  const hasMultiple = totalCount > 1;

  // Helper to get form defaults from a vaccination object
  const getDefaultsFromVaccination = (vacc) => ({
    type: vacc?.type || vacc?.name || vacc?.vaccineName || '',
    dateAdministered: vacc?.dateAdministered
      ? format(new Date(vacc.dateAdministered), 'yyyy-MM-dd')
      : vacc?.administeredAt
        ? format(new Date(vacc.administeredAt), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
    expirationDate: vacc?.expirationDate
      ? format(new Date(vacc.expirationDate), 'yyyy-MM-dd')
      : vacc?.expiresAt
        ? format(new Date(vacc.expiresAt), 'yyyy-MM-dd')
        : format(addDays(new Date(), 365), 'yyyy-MM-dd'),
    veterinarian: vacc?.veterinarian || vacc?.administeredBy || '',
    notes: vacc?.notes || '',
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: getDefaultsFromVaccination(vaccination),
  });

  // Reset form when current vaccination changes
  useEffect(() => {
    if (vaccination) {
      reset(getDefaultsFromVaccination(vaccination));
    }
  }, [vaccination, reset, currentIndex]);

  const navigateTo = (index) => {
    if (index >= 0 && index < totalCount) {
      setCurrentIndex(index);
    }
  };

  const onSubmit = async (data) => {
    try {
      const vaccinationId = vaccination?.id || vaccination?.recordId;
      const result = await updateMutation.mutateAsync({
        vaccinationId,
        payload: {
          type: data.type,
          dateAdministered: data.dateAdministered,
          expirationDate: data.expirationDate,
          veterinarian: data.veterinarian || null,
          notes: data.notes || null,
        },
      });

      // Mark this vaccination as updated
      setUpdatedIndices(prev => new Set([...prev, currentIndex]));

      // If there are more vaccinations, navigate to next; otherwise close
      if (hasMultiple && currentIndex < totalCount - 1) {
        toast.success(`${data.type} updated! Moving to next vaccination...`);
        setCurrentIndex(currentIndex + 1);
      } else if (hasMultiple && updatedIndices.size + 1 < totalCount) {
        // Find first non-updated vaccination
        const nextUnupdated = vaccinations.findIndex((_, idx) => !updatedIndices.has(idx) && idx !== currentIndex);
        if (nextUnupdated !== -1) {
          toast.success(`${data.type} updated! ${totalCount - updatedIndices.size - 1} remaining...`);
          setCurrentIndex(nextUnupdated);
        } else {
          onSuccess?.(result || data);
        }
      } else {
        onSuccess?.(result || data);
      }
    } catch (error) {
      console.error('Failed to update vaccination:', error);
      toast.error(error?.message || 'Failed to update vaccination');
    }
  };

  const isLoading = updateMutation.isPending;
  const vaccinationType = vaccination?.type || vaccination?.name || vaccination?.vaccineName || 'Vaccination';

  // Calculate vaccination status based on days until expiry
  const getVaccinationStatus = () => {
    const expirationDate = vaccination?.expirationDate || vaccination?.expiresAt;
    if (!expirationDate) return null;

    const now = new Date();
    const expiry = new Date(expirationDate);
    const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return 'expired';      // Past expiration
    if (daysLeft <= 7) return 'critical';    // Within 7 days
    if (daysLeft <= 30) return 'expiring';   // Within 30 days
    return 'current';                         // More than 30 days out
  };

  const vaccinationStatus = vaccination?.status || getVaccinationStatus();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Pet Info Header with Navigation */}
      <div
        className="p-3 rounded-lg border"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        {petName && (
          <>
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">Updating vaccinations for</p>
            <p className="font-medium text-[color:var(--bb-color-text-primary)]">{petName}</p>
          </>
        )}

        {/* Navigation UI when multiple vaccinations */}
        {hasMultiple && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo(currentIndex - 1)}
                disabled={currentIndex === 0 || isLoading}
                leftIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                }
              >
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                  {currentIndex + 1} of {totalCount}
                </span>
                {updatedIndices.size > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                    {updatedIndices.size} updated
                  </span>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo(currentIndex + 1)}
                disabled={currentIndex === totalCount - 1 || isLoading}
                rightIcon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                }
              >
                Next
              </Button>
            </div>

            {/* Vaccination pills/tabs */}
            <div className="mt-2 flex flex-wrap gap-1">
              {vaccinations.map((vacc, idx) => {
                const vaccName = vacc?.type || vacc?.name || vacc?.vaccineName || `Vacc ${idx + 1}`;
                const isActive = idx === currentIndex;
                const isUpdated = updatedIndices.has(idx);

                return (
                  <Button
                    key={vacc?.id || vacc?.recordId || idx}
                    variant={isActive ? 'primary' : 'ghost'}
                    size="xs"
                    onClick={() => navigateTo(idx)}
                    disabled={isLoading}
                    className={cn(
                      'rounded-full',
                      !isActive && isUpdated && 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                    )}
                  >
                    {isUpdated && !isActive && '✓ '}
                    {vaccName}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status badge for current vaccination */}
      <div className="flex items-center gap-2">
        {vaccinationStatus === 'expired' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
            ⚠️ Expired
          </span>
        )}
        {vaccinationStatus === 'critical' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">
            🚨 Critical
          </span>
        )}
        {vaccinationStatus === 'expiring' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
            ⏰ Expiring Soon
          </span>
        )}
        {vaccinationStatus === 'current' && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
            ✓ Current
          </span>
        )}
        <span className="text-sm text-[color:var(--bb-color-text-muted)]">
          {vaccinationType}
        </span>
      </div>

      <FormSection title="Vaccination Details">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Vaccine Type <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <input
            type="text"
            {...register('type', { required: 'Vaccine type is required' })}
            className={inputClass}
            style={{ ...inputStyles, borderColor: errors.type ? 'var(--bb-color-status-negative)' : inputStyles.borderColor }}
            placeholder="e.g., Rabies, DHPP, Bordetella"
          />
          {errors.type && <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>{errors.type.message}</p>}
        </div>

        <FormGrid cols={2}>
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
        </FormGrid>

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

        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className={cn(inputClass, 'resize-y')}
            style={inputStyles}
            placeholder="Any additional notes..."
          />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          {updatedIndices.size > 0 ? 'Done' : 'Cancel'}
        </Button>
        <Button type="submit" disabled={isLoading || !isDirty}>
          {isLoading ? 'Updating...' : hasMultiple ? 'Update & Continue' : 'Update Vaccination'}
        </Button>
      </FormActions>
    </form>
  );
}

// Send Receipt Form - Email only
function SendReceiptForm({ ownerId, payment, onSuccess, onCancel }) {
  const { data: owner } = useOwner(ownerId, { enabled: !!ownerId });
  const createMutation = useCreateCommunicationMutation();
  const [message, setMessage] = useState('');

  // Pre-fill with receipt template
  useEffect(() => {
    if (payment && owner) {
      const amount = ((payment.amountCents || payment.amount || 0) / 100).toFixed(2);
      setMessage(
        `Dear ${owner.firstName || 'Customer'},\n\n` +
        `Thank you for your payment of $${amount}.\n\n` +
        `Transaction ID: ${payment.recordId || payment.id}\n` +
        `Date: ${payment.capturedAt || payment.createdAt ? format(new Date(payment.capturedAt || payment.createdAt), 'PPP') : 'N/A'}\n` +
        `Method: ${(payment.method || 'Card').toUpperCase()}\n\n` +
        `If you have any questions, please don't hesitate to contact us.\n\n` +
        `Best regards`
      );
    }
  }, [payment, owner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const result = await createMutation.mutateAsync({
        ownerId,
        channel: 'email',
        direction: 'outbound',
        subject: `Payment Receipt - $${((payment?.amountCents || payment?.amount || 0) / 100).toFixed(2)}`,
        content: message,
        recipient: owner?.email,
        status: 'sent',
        timestamp: new Date().toISOString(),
      });
      onSuccess?.(result);
    } catch (error) {
      toast.error(error?.message || 'Failed to send receipt');
    }
  };

  const isLoading = createMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Recipient Info */}
      {owner && (
        <div
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-elevated)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--bb-color-text-muted)' }}>
            Sending to
          </p>
          <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            {owner.firstName} {owner.lastName}
          </p>
          <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
            {owner.email}
          </p>
        </div>
      )}

      <FormSection title="Receipt Email">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Message <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={10}
            className={cn(inputClass, 'resize-y font-mono text-xs')}
            style={inputStyles}
            placeholder="Receipt message..."
          />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !message.trim() || !owner?.email}>
          {isLoading ? 'Sending...' : 'Send Receipt'}
        </Button>
      </FormActions>
    </form>
  );
}

// New Conversation Form - Select owner and send first message
function NewConversationForm({ onSuccess, onCancel }) {
  const { data: owners, isLoading: ownersLoading } = useOwnersQuery();
  const sendMutation = useSendMessageMutation();
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [message, setMessage] = useState('');

  const ownerOptions = (owners || []).map(owner => ({
    value: owner.recordId,
    label: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email || 'Unknown',
    owner,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOwner || !message.trim()) return;

    try {
      const result = await sendMutation.mutateAsync({
        recipientId: selectedOwner.value,
        content: message.trim(),
      });
      onSuccess?.(result);
    } catch (error) {
      toast.error(error?.message || 'Failed to start conversation');
    }
  };

  const isLoading = sendMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Select Customer">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Customer <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <Select
            options={ownerOptions}
            value={selectedOwner}
            onChange={setSelectedOwner}
            placeholder="Search for a customer..."
            isLoading={ownersLoading}
            isClearable
            isSearchable
            styles={selectStyles}
            menuPortalTarget={document.body}
          />
        </div>

        {selectedOwner?.owner && (
          <div
            className="p-3 rounded-lg border mt-3"
            style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-elevated)' }}
          >
            <p className="font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              {selectedOwner.label}
            </p>
            {selectedOwner.owner.email && (
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                {selectedOwner.owner.email}
              </p>
            )}
            {selectedOwner.owner.phone && (
              <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
                {selectedOwner.owner.phone}
              </p>
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="Message">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Your Message <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className={cn(inputClass, 'resize-y')}
            style={inputStyles}
            placeholder="Type your message here..."
          />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !selectedOwner || !message.trim()}>
          {isLoading ? 'Sending...' : 'Start Conversation'}
        </Button>
      </FormActions>
    </form>
  );
}

export default SlideoutHost;
