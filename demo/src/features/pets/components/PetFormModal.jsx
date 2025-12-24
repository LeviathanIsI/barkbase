/**
 * Pet Form Modal - Demo Version
 * SlideoutPanel form for creating/editing pets with mock data.
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import Button from '@/components/ui/Button';
import SlideoutPanel from '@/components/ui/SlideoutPanel';
import { cn } from '@/lib/cn';
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
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--bb-color-accent)'
      : state.isFocused
      ? 'var(--bb-color-bg-muted)'
      : 'transparent',
    color: state.isSelected ? 'white' : 'var(--bb-color-text-primary)',
    cursor: 'pointer',
    borderRadius: '0.375rem',
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
    ':hover': { backgroundColor: 'var(--bb-color-accent-dark, #2563eb)', color: 'white' },
  }),
};

const PetFormModal = ({ open, onClose, onSubmit, pet = null, isLoading = false }) => {
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
      species: 'Dog',
      breed: '',
      status: 'active',
      dateOfBirth: '',
      weight: '',
      color: '',
      gender: '',
      microchipId: '',
      feedingInstructions: '',
      medications: '',
      allergies: '',
      behaviorNotes: '',
      behaviorFlags: [],
    },
  });

  // Owner selection state
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Fetch owners for dropdown
  const { data: ownersResult } = useOwnersQuery();
  const owners = ownersResult?.data || [];

  const ownerOptions = useMemo(() => {
    return owners.map((owner) => ({
      value: owner.id,
      label: owner.name || `${owner.firstName} ${owner.lastName}`,
    }));
  }, [owners]);

  // Reset form when pet changes or modal opens
  useEffect(() => {
    if (pet) {
      reset({
        name: pet.name || '',
        species: pet.species || 'Dog',
        breed: pet.breed || '',
        status: pet.status || 'active',
        dateOfBirth: pet.dateOfBirth ? pet.dateOfBirth.split('T')[0] : '',
        weight: pet.weight || '',
        color: pet.color || '',
        gender: pet.gender || '',
        microchipId: pet.microchipId || '',
        feedingInstructions: pet.feedingInstructions || '',
        medications: pet.medications || '',
        allergies: pet.allergies || '',
        behaviorNotes: pet.behaviorNotes || '',
        behaviorFlags: pet.behaviorFlags || [],
      });
      // Set selected owner
      if (pet.ownerId) {
        const owner = owners.find((o) => o.id === pet.ownerId);
        if (owner) {
          setSelectedOwner({
            value: owner.id,
            label: owner.name || `${owner.firstName} ${owner.lastName}`,
          });
        }
      }
    } else if (open) {
      reset({
        name: '',
        species: 'Dog',
        breed: '',
        status: 'active',
        dateOfBirth: '',
        weight: '',
        color: '',
        gender: '',
        microchipId: '',
        feedingInstructions: '',
        medications: '',
        allergies: '',
        behaviorNotes: '',
        behaviorFlags: [],
      });
      setSelectedOwner(null);
    }
  }, [pet, open, reset, owners]);

  const handleFormSubmit = async (data) => {
    await onSubmit({
      ...data,
      ownerId: selectedOwner?.value || null,
    });
  };

  const inputClass = cn(
    'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
    'focus:outline-none focus:ring-1 focus:ring-[var(--bb-color-accent)]'
  );

  const inputStyles = {
    backgroundColor: 'var(--bb-color-bg-body)',
    borderColor: 'var(--bb-color-border-subtle)',
    color: 'var(--bb-color-text-primary)',
  };

  return (
    <SlideoutPanel
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Pet' : 'Add New Pet'}
      subtitle={isEdit ? `Update ${pet?.name}'s information` : 'Enter the pet details below'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className={inputClass}
                  style={{
                    ...inputStyles,
                    borderColor: errors.name ? 'rgb(239 68 68)' : inputStyles.borderColor,
                  }}
                  placeholder="Buddy"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
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
                  value={
                    [
                      { value: 'Dog', label: 'Dog' },
                      { value: 'Cat', label: 'Cat' },
                      { value: 'Bird', label: 'Bird' },
                      { value: 'Rabbit', label: 'Rabbit' },
                      { value: 'Other', label: 'Other' },
                    ].find((o) => o.value === watch('species')) || null
                  }
                  onChange={(opt) => setValue('species', opt?.value || 'Dog', { shouldDirty: true })}
                  placeholder="Select species"
                  isClearable={false}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
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

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Color
                </label>
                <input
                  type="text"
                  {...register('color')}
                  className={inputClass}
                  style={inputStyles}
                  placeholder="Golden"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Gender
                </label>
                <Select
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                  ]}
                  value={
                    [
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                    ].find((o) => o.value === watch('gender')) || null
                  }
                  onChange={(opt) => setValue('gender', opt?.value || '', { shouldDirty: true })}
                  placeholder="Select"
                  isClearable
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Date of Birth
                </label>
                <input
                  type="date"
                  {...register('dateOfBirth')}
                  className={inputClass}
                  style={inputStyles}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('weight')}
                  className={inputClass}
                  style={inputStyles}
                  placeholder="45"
                />
              </div>
            </div>
          </div>

          {/* Owner Association */}
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4">
              Owner
            </h3>
            <Select
              options={ownerOptions}
              value={selectedOwner}
              onChange={(selected) => setSelectedOwner(selected)}
              placeholder="Select an owner..."
              isClearable
              isSearchable
              styles={selectStyles}
              menuPortalTarget={document.body}
              noOptionsMessage={() => 'No owners found'}
            />
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4">
              Additional Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Microchip ID
                </label>
                <input
                  type="text"
                  {...register('microchipId')}
                  className={inputClass}
                  style={inputStyles}
                  placeholder="985141404123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Allergies
                </label>
                <input
                  type="text"
                  {...register('allergies')}
                  className={inputClass}
                  style={inputStyles}
                  placeholder="Chicken, pollen..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Medications
                </label>
                <textarea
                  {...register('medications')}
                  rows={2}
                  className={cn(inputClass, 'resize-none')}
                  style={inputStyles}
                  placeholder="Current medications and dosages..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Feeding Instructions
                </label>
                <textarea
                  {...register('feedingInstructions')}
                  rows={2}
                  className={cn(inputClass, 'resize-none')}
                  style={inputStyles}
                  placeholder="Food type, portion size, schedule..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Behavior Notes
                </label>
                <textarea
                  {...register('behaviorNotes')}
                  rows={3}
                  className={cn(inputClass, 'resize-none')}
                  style={inputStyles}
                  placeholder="Any special behavior considerations..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1.5">
                  Status
                </label>
                <Select
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                  value={
                    [
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ].find((o) => o.value === watch('status')) || null
                  }
                  onChange={(opt) => setValue('status', opt?.value || 'active', { shouldDirty: true })}
                  isClearable={false}
                  styles={selectStyles}
                  menuPortalTarget={document.body}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 flex items-center justify-end gap-3 p-4 border-t"
          style={{ borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || (!isDirty && isEdit && !selectedOwner)}>
            {isLoading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Pet'}
          </Button>
        </div>
      </form>
    </SlideoutPanel>
  );
};

export default PetFormModal;
