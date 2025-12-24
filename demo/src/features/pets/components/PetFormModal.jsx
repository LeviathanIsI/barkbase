/**
 * Pet Form Modal - Phase 9 Enterprise Form System
 * Token-based styling for consistent theming.
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import SlideoutPanel from '@/components/SlideoutPanel';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';
import { useOwnersQuery } from '@/features/owners/api';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
    '&:hover': { borderColor: 'var(--bb-color-border-subtle)' },
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
    color: 'white',
    ':hover': {
      backgroundColor: 'var(--bb-color-accent-dark, #2563eb)',
      color: 'white',
    },
  }),
};

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
      // Veterinarian info
      vetName: '',
      vetPhone: '',
      vetClinic: '',
      vetAddress: '',
      vetEmail: '',
      vetNotes: '',
    },
  });

  // Owner selection state
  const [selectedOwners, setSelectedOwners] = useState([]);

  // Fetch owners for the dropdown
  const { data: ownersData } = useOwnersQuery();
  const ownerOptions = useMemo(() => {
    // useOwnersQuery returns array directly
    const owners = Array.isArray(ownersData) ? ownersData : [];
    return owners.map(owner => ({
      value: owner.recordId || owner.record_id || owner.id,
      label: owner.name || `${owner.firstName || owner.first_name || ''} ${owner.lastName || owner.last_name || ''}`.trim() || owner.email || 'Unknown',
    }));
  }, [ownersData]);

  // Reset form when pet changes or modal opens
  useEffect(() => {
    if (pet) {
      reset({
        name: pet.name || '',
        species: pet.species || '',
        breed: pet.breed || '',
        status: pet.status || 'active',
        medicalNotes: pet.medicalNotes || pet.medical_notes || '',
        dietaryNotes: pet.dietaryNotes || pet.dietary_notes || '',
        birthdate: pet.birthdate || pet.date_of_birth ? new Date(pet.birthdate || pet.date_of_birth).toISOString().split('T')[0] : '',
        weight: pet.weight || '',
        allergies: pet.allergies || '',
        lastVetVisit: pet.lastVetVisit || pet.last_vet_visit ? new Date(pet.lastVetVisit || pet.last_vet_visit).toISOString().split('T')[0] : '',
        nextAppointment: pet.nextAppointment ? new Date(pet.nextAppointment).toISOString().split('T')[0] : '',
        behaviorFlags: pet.behaviorFlags || pet.behavior_flags || [],
        photoUrl: pet.photoUrl || pet.photo_url || '',
        // Veterinarian info
        vetName: pet.vetName || pet.vet_name || '',
        vetPhone: pet.vetPhone || pet.vet_phone || '',
        vetClinic: pet.vetClinic || pet.vet_clinic || '',
        vetAddress: pet.vetAddress || pet.vet_address || '',
        vetEmail: pet.vetEmail || pet.vet_email || '',
        vetNotes: pet.vetNotes || pet.vet_notes || '',
      });
      // Set selected owners when editing a pet
      if (pet.owners && Array.isArray(pet.owners)) {
        const ownerSelections = pet.owners.map(owner => ({
          value: owner.recordId || owner.record_id || owner.id,
          label: owner.name || `${owner.firstName || owner.first_name || ''} ${owner.lastName || owner.last_name || ''}`.trim() || owner.email || 'Unknown',
        }));
        setSelectedOwners(ownerSelections);
      } else {
        setSelectedOwners([]);
      }
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
        vetName: '',
        vetPhone: '',
        vetClinic: '',
        vetAddress: '',
        vetEmail: '',
        vetNotes: '',
      });
      setSelectedOwners([]);
    }
  }, [pet, open, reset]);

  const handleFormSubmit = async (data) => {
    // Include selected owner IDs in the submission
    const ownerIds = selectedOwners.map(o => o.value);
    await onSubmit({ ...data, ownerIds });
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
      title={isEdit ? 'Edit Pet' : 'Create New Pet'}
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-[var(--bb-space-6,1.5rem)]">
        {/* Basic Info */}
        <FormSection title="Basic Information">
          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Name <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="text"
                {...register('name', { required: 'Pet name is required' })}
                className={inputClass}
                style={{
                  ...inputStyles,
                  borderColor: errors.name ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
                }}
                placeholder="Buddy"
              />
              {errors.name && (
                <p
                  className="text-[var(--bb-font-size-xs,0.75rem)]"
                  style={{ color: 'var(--bb-color-status-negative)' }}
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Breed
              </label>
              <input
                type="text"
                {...register('breed')}
                className={inputClass}
                style={inputStyles}
                placeholder="Golden Retriever"
              />
            </div>
          </FormGrid>

          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Species
              </label>
              <Select
                options={[
                  { value: 'Dog', label: 'Dog' },
                  { value: 'Cat', label: 'Cat' },
                  { value: 'Bird', label: 'Bird' },
                  { value: 'Rabbit', label: 'Rabbit' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={[{ value: 'Dog', label: 'Dog' }, { value: 'Cat', label: 'Cat' }, { value: 'Bird', label: 'Bird' }, { value: 'Rabbit', label: 'Rabbit' }, { value: 'Other', label: 'Other' }].find(o => o.value === watch('species')) || null}
                onChange={(opt) => setValue('species', opt?.value || '', { shouldDirty: true })}
                placeholder="Select species"
                isClearable={false}
                isSearchable
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Weight (lbs)
              </label>
              <input
                type="number"
                step="0.1"
                {...register('weight')}
                className={inputClass}
                style={inputStyles}
                placeholder="25.5"
              />
            </div>
          </FormGrid>

          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Birthdate
              </label>
              <input
                type="date"
                {...register('birthdate')}
                className={inputClass}
                style={inputStyles}
              />
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Status
              </label>
              <Select
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].find(o => o.value === watch('status')) || null}
                onChange={(opt) => setValue('status', opt?.value || 'active', { shouldDirty: true })}
                placeholder="Select status"
                isClearable={false}
                isSearchable
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
          </FormGrid>
        </FormSection>

        {/* Owner Association */}
        <FormSection title="Owner Association">
          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Associate Owners
            </label>
            <p
              className="text-[var(--bb-font-size-xs,0.75rem)] mb-[var(--bb-space-2,0.5rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              Select one or more owners for this pet (e.g., couples or families)
            </p>
            <Select
              isMulti
              options={ownerOptions}
              value={selectedOwners}
              onChange={(selected) => setSelectedOwners(selected || [])}
              placeholder="Search and select owners..."
              isClearable
              isSearchable
              styles={selectStyles}
              menuPortalTarget={document.body}
              noOptionsMessage={() => 'No owners found'}
            />
          </div>
        </FormSection>

        {/* Health Information */}
        <FormSection title="Health Information">
          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Allergies
            </label>
            <input
              type="text"
              {...register('allergies')}
              className={inputClass}
              style={inputStyles}
              placeholder="Pollen, chicken, medication names..."
            />
          </div>

          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Last Vet Visit
              </label>
              <input
                type="date"
                {...register('lastVetVisit')}
                className={inputClass}
                style={inputStyles}
              />
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Next Appointment
              </label>
              <input
                type="date"
                {...register('nextAppointment')}
                className={inputClass}
                style={inputStyles}
              />
            </div>
          </FormGrid>

          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Medical Notes
            </label>
            <textarea
              {...register('medicalNotes')}
              rows={3}
              className={cn(inputClass, 'min-h-[6rem] resize-y')}
              style={inputStyles}
              placeholder="Additional health conditions, medications, or special care instructions..."
            />
          </div>

          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Dietary Notes
            </label>
            <textarea
              {...register('dietaryNotes')}
              rows={3}
              className={cn(inputClass, 'min-h-[6rem] resize-y')}
              style={inputStyles}
              placeholder="Food preferences, restrictions, or feeding schedule..."
            />
          </div>
        </FormSection>

        {/* Veterinarian Information */}
        <FormSection title="Veterinarian Information">
          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Veterinarian Name
              </label>
              <input
                type="text"
                {...register('vetName')}
                className={inputClass}
                style={inputStyles}
                placeholder="Dr. Smith"
              />
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Vet Phone
              </label>
              <input
                type="tel"
                {...register('vetPhone')}
                className={inputClass}
                style={inputStyles}
                placeholder="(555) 123-4567"
              />
            </div>
          </FormGrid>

          <FormGrid cols={2}>
            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Clinic/Hospital Name
              </label>
              <input
                type="text"
                {...register('vetClinic')}
                className={inputClass}
                style={inputStyles}
                placeholder="Happy Paws Veterinary Clinic"
              />
            </div>

            <div className="space-y-[var(--bb-space-2,0.5rem)]">
              <label
                className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                style={{ color: 'var(--bb-color-text-primary)' }}
              >
                Vet Email
              </label>
              <input
                type="email"
                {...register('vetEmail')}
                className={inputClass}
                style={inputStyles}
                placeholder="vet@clinic.com"
              />
            </div>
          </FormGrid>

          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Clinic Address
            </label>
            <input
              type="text"
              {...register('vetAddress')}
              className={inputClass}
              style={inputStyles}
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Vet Notes
            </label>
            <textarea
              {...register('vetNotes')}
              rows={2}
              className={cn(inputClass, 'min-h-[4rem] resize-y')}
              style={inputStyles}
              placeholder="Special instructions, preferred vet, emergency contacts..."
            />
          </div>
        </FormSection>

        {/* Additional Info */}
        <FormSection title="Additional Information">
          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Photo URL
            </label>
            <input
              type="url"
              {...register('photoUrl')}
              className={inputClass}
              style={inputStyles}
              placeholder="https://example.com/pet-photo.jpg"
            />
          </div>

          <div className="space-y-[var(--bb-space-2,0.5rem)]">
            <label
              className="block text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Behavior Flags
            </label>
            <p
              className="text-[var(--bb-font-size-xs,0.75rem)] mb-[var(--bb-space-3,0.75rem)]"
              style={{ color: 'var(--bb-color-text-muted)' }}
            >
              Select all behaviors that apply to this pet
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[var(--bb-space-3,0.75rem)]">
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
                <label
                  key={flag}
                  className="flex items-center gap-[var(--bb-space-2,0.5rem)] cursor-pointer"
                >
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
                    className="h-4 w-4 rounded"
                    style={{
                      borderColor: 'var(--bb-color-border-subtle)',
                      accentColor: 'var(--bb-color-accent)',
                    }}
                  />
                  <span
                    className="text-[var(--bb-font-size-sm,0.875rem)]"
                    style={{ color: 'var(--bb-color-text-primary)' }}
                  >
                    {flag}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </FormSection>

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
            {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Pet' : 'Create Pet')}
          </Button>
        </FormActions>
      </form>
    </SlideoutPanel>
  );
};

export default PetFormModal;
