/**
 * Incident Form Component
 * Form for creating and editing incident reports
 */
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import Select from 'react-select';
import Button from '@/components/ui/Button';
import SlideoutPanel from '@/components/SlideoutPanel';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';
import { cn } from '@/lib/cn';
import { getPets } from '@/features/pets/api';

// Custom styles for react-select to match dark theme
const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.375rem',
    minHeight: '38px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
    '&:hover': {
      borderColor: 'var(--bb-color-border-subtle)',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.375rem',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'var(--bb-color-accent)'
      : state.isFocused
        ? 'var(--bb-color-bg-muted)'
        : 'transparent',
    color: state.isSelected ? 'white' : 'var(--bb-color-text-primary)',
    cursor: 'pointer',
    borderRadius: '0.25rem',
    padding: '8px 12px',
    '&:active': {
      backgroundColor: 'var(--bb-color-accent)',
    },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-muted)',
    borderRadius: '0.25rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
    padding: '2px 6px',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    '&:hover': {
      backgroundColor: 'var(--bb-color-status-negative)',
      color: 'white',
    },
  }),
  input: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-border-subtle)',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    '&:hover': {
      color: 'var(--bb-color-text-primary)',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    '&:hover': {
      color: 'var(--bb-color-status-negative)',
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
  }),
  loadingMessage: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
  }),
};

// Values match database enum: INJURY, ILLNESS, ESCAPE, BITE, FIGHT, PROPERTY_DAMAGE, BEHAVIOR, OTHER
const INCIDENT_TYPES = [
  { value: 'INJURY', label: 'Injury', description: 'Physical injury to pet or person' },
  { value: 'ILLNESS', label: 'Illness', description: 'Signs of sickness or health issue' },
  { value: 'ESCAPE', label: 'Escape Attempt', description: 'Pet tried to or did escape' },
  { value: 'BITE', label: 'Bite', description: 'Bite incident involving a pet' },
  { value: 'FIGHT', label: 'Fight', description: 'Altercation between pets' },
  { value: 'PROPERTY_DAMAGE', label: 'Property Damage', description: 'Damage to facility or property' },
  { value: 'BEHAVIOR', label: 'Behavior Issue', description: 'Excessive barking, anxiety, etc.' },
  { value: 'OTHER', label: 'Other', description: 'Other incident type' },
];

const SEVERITY_LEVELS = [
  { value: 'LOW', label: 'Low', description: 'Minor issue, no immediate action needed' },
  { value: 'MEDIUM', label: 'Medium', description: 'Moderate concern, monitoring required' },
  { value: 'HIGH', label: 'High', description: 'Serious issue, immediate attention needed' },
  { value: 'CRITICAL', label: 'Critical', description: 'Emergency, requires immediate escalation' },
];

export default function IncidentForm({
  open,
  onClose,
  onSubmit,
  incident = null,
  isLoading = false,
  preselectedPet = null,
}) {
  const isEdit = !!incident;
  const [pets, setPets] = useState([]);
  const [loadingPets, setLoadingPets] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: {
      petIds: [], // Multi-select for pets
      incidentType: '',
      severity: 'LOW',
      title: '',
      description: '',
      incidentDate: new Date().toISOString().slice(0, 16),
      location: '',
      staffWitness: '',
      immediateActions: '',
      vetContacted: false,
      vetName: '',
      medicalTreatment: '',
    },
  });

  const selectedPetIds = watch('petIds') || [];

  // Transform pets to react-select options format
  const petOptions = useMemo(() =>
    pets.map((pet) => ({
      value: pet.id || pet.recordId,
      label: `${pet.name}${pet.breed ? ` (${pet.breed})` : pet.species ? ` (${pet.species})` : ''}`,
    })),
    [pets]
  );

  // Get selected pet options for react-select value
  const selectedPetOptions = useMemo(() =>
    petOptions.filter((opt) => selectedPetIds.includes(opt.value)),
    [petOptions, selectedPetIds]
  );

  // Load pets for selection
  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoadingPets(true);
        const response = await getPets();
        setPets(response.data || []);
      } catch (err) {
        console.error('Failed to load pets:', err);
      } finally {
        setLoadingPets(false);
      }
    };

    if (open) {
      fetchPets();
    }
  }, [open]);

  // Reset form when incident changes
  useEffect(() => {
    if (incident) {
      // Build petIds array from incident data
      const petIds = [];
      if (incident.petId) petIds.push(incident.petId);
      if (incident.petIds?.length) petIds.push(...incident.petIds);

      reset({
        petIds: [...new Set(petIds)], // Dedupe
        // Normalize incidentType to uppercase to match INCIDENT_TYPES values
        incidentType: incident.incidentType?.toUpperCase() || '',
        severity: incident.severity || 'LOW',
        title: incident.title || '',
        description: incident.description || '',
        incidentDate: incident.incidentDate
          ? new Date(incident.incidentDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        location: incident.location || '',
        staffWitness: incident.witnesses || incident.staffWitness || '',
        immediateActions: incident.immediateActions || '',
        vetContacted: incident.vetContacted || false,
        vetName: incident.vetName || '',
        medicalTreatment: incident.medicalTreatment || '',
      });
    } else if (open) {
      reset({
        petIds: preselectedPet?.id ? [preselectedPet.id] : [],
        incidentType: '',
        severity: 'LOW',
        title: '',
        description: '',
        incidentDate: new Date().toISOString().slice(0, 16),
        location: '',
        staffWitness: '',
        immediateActions: '',
        vetContacted: false,
        vetName: '',
        medicalTreatment: '',
      });
    }
  }, [incident, open, reset, preselectedPet]);

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
  };

  const inputClass = cn(
    'w-full rounded-md border px-3 py-2 text-sm',
    'focus:outline-none focus:ring-1',
    'transition-colors'
  );

  const inputStyles = {
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: 'var(--bb-color-border-subtle)',
    color: 'var(--bb-color-text-primary)',
  };

  const vetContacted = watch('vetContacted');

  return (
    <SlideoutPanel
      isOpen={open}
      onClose={onClose}
      title={isEdit ? 'Edit Incident Report' : 'Report New Incident'}
      widthClass="max-w-2xl"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Info */}
        <FormSection title="Incident Details">
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Title <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
            </label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className={inputClass}
              style={{
                ...inputStyles,
                borderColor: errors.title ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
              }}
              placeholder="Brief description of the incident"
            />
            {errors.title && (
              <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
                {errors.title.message}
              </p>
            )}
          </div>

          <FormGrid cols={2}>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                Incident Type <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <Select
                options={INCIDENT_TYPES.map((type) => ({ value: type.value, label: type.label }))}
                value={INCIDENT_TYPES.find(t => t.value === watch('incidentType')) || null}
                onChange={(opt) => setValue('incidentType', opt?.value || '', { shouldDirty: true })}
                placeholder="Select type..."
                isClearable={false}
                isSearchable
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
              {errors.incidentType && (
                <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
                  {errors.incidentType.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                Severity <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <Select
                options={SEVERITY_LEVELS.map((level) => ({ value: level.value, label: `${level.label} - ${level.description}` }))}
                value={SEVERITY_LEVELS.map((level) => ({ value: level.value, label: `${level.label} - ${level.description}` })).find(l => l.value === watch('severity')) || null}
                onChange={(opt) => setValue('severity', opt?.value || 'LOW', { shouldDirty: true })}
                placeholder="Select severity..."
                isClearable={false}
                isSearchable
                styles={selectStyles}
                menuPortalTarget={document.body}
              />
            </div>
          </FormGrid>

          <FormGrid cols={2}>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                Date & Time <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
              </label>
              <input
                type="datetime-local"
                {...register('incidentDate', { required: 'Date is required' })}
                className={inputClass}
                style={{
                  ...inputStyles,
                  borderColor: errors.incidentDate ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
                }}
              />
              {errors.incidentDate && (
                <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
                  {errors.incidentDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                Location
              </label>
              <input
                type="text"
                {...register('location')}
                className={inputClass}
                style={inputStyles}
                placeholder="e.g., Kennel A, Play Yard, Grooming Area"
              />
            </div>
          </FormGrid>

          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Pets Involved
            </label>
            <Select
              isMulti
              isSearchable
              isClearable
              isLoading={loadingPets}
              options={petOptions}
              value={selectedPetOptions}
              onChange={(selected) => {
                const ids = selected ? selected.map((opt) => opt.value) : [];
                setValue('petIds', ids, { shouldDirty: true });
              }}
              placeholder="Search and select pets..."
              noOptionsMessage={() => "No pets found"}
              loadingMessage={() => "Loading pets..."}
              styles={selectStyles}
              classNamePrefix="react-select"
            />
            {selectedPetIds.length > 0 && (
              <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                {selectedPetIds.length} pet{selectedPetIds.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Description <span style={{ color: 'var(--bb-color-status-negative)' }}>*</span>
            </label>
            <textarea
              {...register('description', { required: 'Description is required' })}
              rows={4}
              className={cn(inputClass, 'resize-y min-h-[100px]')}
              style={{
                ...inputStyles,
                borderColor: errors.description ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
              }}
              placeholder="Provide a detailed account of what happened..."
            />
            {errors.description && (
              <p className="text-xs" style={{ color: 'var(--bb-color-status-negative)' }}>
                {errors.description.message}
              </p>
            )}
          </div>
        </FormSection>

        {/* Witnesses & Response */}
        <FormSection title="Response & Actions">
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Witnesses
            </label>
            <input
              type="text"
              {...register('staffWitness')}
              className={inputClass}
              style={inputStyles}
              placeholder="Names of staff or others who witnessed the incident"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
              Immediate Actions Taken
            </label>
            <textarea
              {...register('immediateActions')}
              rows={3}
              className={cn(inputClass, 'resize-y min-h-[80px]')}
              style={inputStyles}
              placeholder="What steps were taken immediately after the incident..."
            />
          </div>
        </FormSection>

        {/* Veterinary Info */}
        <FormSection title="Veterinary Information">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="vetContacted"
              {...register('vetContacted')}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--bb-color-accent)' }}
            />
            <label
              htmlFor="vetContacted"
              className="text-sm font-medium"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Veterinarian was contacted
            </label>
          </div>

          {vetContacted && (
            <div className="space-y-4 pl-7">
              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                  Veterinarian Name
                </label>
                <input
                  type="text"
                  {...register('vetName')}
                  className={inputClass}
                  style={inputStyles}
                  placeholder="Name of vet contacted"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium" style={{ color: 'var(--bb-color-text-primary)' }}>
                  Medical Treatment
                </label>
                <textarea
                  {...register('medicalTreatment')}
                  rows={3}
                  className={cn(inputClass, 'resize-y min-h-[80px]')}
                  style={inputStyles}
                  placeholder="Describe any medical treatment provided or recommended..."
                />
              </div>
            </div>
          )}
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
            {isLoading
              ? (isEdit ? 'Updating...' : 'Submitting...')
              : (isEdit ? 'Update Report' : 'Submit Report')}
          </Button>
        </FormActions>
      </form>
    </SlideoutPanel>
  );
}

