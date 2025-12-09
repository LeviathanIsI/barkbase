/**
 * SlideoutHost - Renders the active slideout panel
 * Place this once in the app layout to enable global slideouts
 */

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import SlideoutPanel from '@/components/SlideoutPanel';
import { useSlideout, SLIDEOUT_TYPES } from './SlideoutProvider';
import { useTenantStore } from '@/stores/tenant';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';

// API hooks
import { useCreatePetMutation, useUpdatePetMutation, useUpdateVaccinationMutation } from '@/features/pets/api';
import { useCreateOwnerMutation, useUpdateOwnerMutation } from '@/features/owners/api';
import { useCreateNote } from '@/features/communications/api';
import { format, addDays } from 'date-fns';

// Form components for complex flows
import BookingSlideoutForm from '@/features/bookings/components/BookingSlideoutForm';
import TaskSlideoutForm from '@/features/tasks/components/TaskSlideoutForm';
import CommunicationSlideoutForm from '@/features/communications/components/CommunicationSlideoutForm';

/**
 * SlideoutHost component
 * Renders the appropriate form based on slideout state
 */
export function SlideoutHost() {
  const { state, isOpen, closeSlideout, handleSuccess } = useSlideout();
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

      case SLIDEOUT_TYPES.VACCINATION_EDIT:
        return [
          ['petVaccinations', { tenantId, petId: state?.props?.petId }],
          ['vaccinations'],
          ['vaccinations', 'expiring'],
          state?.props?.petId ? ['pets', { tenantId }, state.props.petId] : null,
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
      case SLIDEOUT_TYPES.NOTE_CREATE: return 'Note added successfully';
      case SLIDEOUT_TYPES.ACTIVITY_LOG: return 'Activity logged successfully';
      case SLIDEOUT_TYPES.VACCINATION_EDIT: return 'Vaccination updated successfully';
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

      case SLIDEOUT_TYPES.NOTE_CREATE:
        return (
          <NoteForm
            ownerId={props?.ownerId}
            petId={props?.petId}
            bookingId={props?.bookingId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.ACTIVITY_LOG:
        return (
          <ActivityLogForm
            ownerId={props?.ownerId}
            petId={props?.petId}
            onSuccess={onFormSuccess}
            onCancel={closeSlideout}
          />
        );

      case SLIDEOUT_TYPES.VACCINATION_EDIT:
        return (
          <VaccinationEditForm
            vaccination={props?.vaccination}
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
            <select {...register('species')} className={inputClass} style={inputStyles}>
              <option value="">Select species</option>
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
              <option value="Other">Other</option>
            </select>
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
function NoteForm({ ownerId, petId, bookingId, onSuccess, onCancel }) {
  const createMutation = useCreateNote();
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    try {
      const result = await createMutation.mutateAsync({
        ownerId,
        petId,
        bookingId,
        type: 'general',
        content,
        entityType: ownerId ? 'owner' : petId ? 'pet' : 'booking',
        entityId: ownerId || petId || bookingId,
      });
      onSuccess?.(result);
    } catch (error) {
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

// Activity Log Form
const ACTIVITY_TYPES = [
  { value: 'call', label: 'Phone Call', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'note', label: 'Note', icon: '📝' },
  { value: 'visit', label: 'Visit', icon: '🏠' },
  { value: 'other', label: 'Other', icon: '📋' },
];

function ActivityLogForm({ ownerId, petId, onSuccess, onCancel }) {
  const createMutation = useCreateNote();
  const [activityType, setActivityType] = useState('note');
  const [content, setContent] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const result = await createMutation.mutateAsync({
        ownerId,
        petId,
        type: activityType,
        content,
        entityType: ownerId ? 'owner' : 'pet',
        entityId: ownerId || petId,
      });
      onSuccess?.(result);
    } catch (error) {
      toast.error(error?.message || 'Failed to log activity');
    }
  };

  const isLoading = createMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormSection title="Activity Type">
        <div className="grid grid-cols-5 gap-2">
          {ACTIVITY_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setActivityType(type.value)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors',
                activityType === type.value
                  ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
                  : 'border-[color:var(--bb-color-border-subtle)] hover:bg-[color:var(--bb-color-bg-surface)]'
              )}
            >
              <span className="text-lg">{type.icon}</span>
              <span style={{ color: 'var(--bb-color-text-primary)' }}>{type.label}</span>
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title="Details">
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
            Description <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            className={cn(inputClass, 'resize-y')}
            style={inputStyles}
            placeholder="Describe the activity..."
          />
        </div>
      </FormSection>

      <FormActions>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading || !content.trim()}>
          {isLoading ? 'Logging...' : 'Log Activity'}
        </Button>
      </FormActions>
    </form>
  );
}

// Vaccination Edit Form
function VaccinationEditForm({ vaccination, petId, petName, onSuccess, onCancel }) {
  const updateMutation = useUpdateVaccinationMutation(petId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: {
      type: vaccination?.type || vaccination?.name || vaccination?.vaccineName || '',
      dateAdministered: vaccination?.dateAdministered
        ? format(new Date(vaccination.dateAdministered), 'yyyy-MM-dd')
        : vaccination?.administeredAt
          ? format(new Date(vaccination.administeredAt), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
      expirationDate: vaccination?.expirationDate
        ? format(new Date(vaccination.expirationDate), 'yyyy-MM-dd')
        : vaccination?.expiresAt
          ? format(new Date(vaccination.expiresAt), 'yyyy-MM-dd')
          : format(addDays(new Date(), 365), 'yyyy-MM-dd'),
      veterinarian: vaccination?.veterinarian || vaccination?.administeredBy || '',
      notes: vaccination?.notes || '',
    },
  });

  useEffect(() => {
    if (vaccination) {
      reset({
        type: vaccination?.type || vaccination?.name || vaccination?.vaccineName || '',
        dateAdministered: vaccination?.dateAdministered
          ? format(new Date(vaccination.dateAdministered), 'yyyy-MM-dd')
          : vaccination?.administeredAt
            ? format(new Date(vaccination.administeredAt), 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd'),
        expirationDate: vaccination?.expirationDate
          ? format(new Date(vaccination.expirationDate), 'yyyy-MM-dd')
          : vaccination?.expiresAt
            ? format(new Date(vaccination.expiresAt), 'yyyy-MM-dd')
            : format(addDays(new Date(), 365), 'yyyy-MM-dd'),
        veterinarian: vaccination?.veterinarian || vaccination?.administeredBy || '',
        notes: vaccination?.notes || '',
      });
    }
  }, [vaccination, reset]);

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
      onSuccess?.(result || data);
    } catch (error) {
      console.error('Failed to update vaccination:', error);
      toast.error(error?.message || 'Failed to update vaccination');
    }
  };

  const isLoading = updateMutation.isPending;
  const vaccinationType = vaccination?.type || vaccination?.name || vaccination?.vaccineName || 'Vaccination';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Pet Info Header */}
      {petName && (
        <div
          className="p-3 rounded-lg border"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">Updating vaccination for</p>
          <p className="font-medium text-[color:var(--bb-color-text-primary)]">{petName}</p>
        </div>
      )}

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
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading || !isDirty}>
          {isLoading ? 'Updating...' : 'Update Vaccination'}
        </Button>
      </FormActions>
    </form>
  );
}

export default SlideoutHost;
