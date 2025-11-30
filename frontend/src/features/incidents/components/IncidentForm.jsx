/**
 * Incident Form Component
 * Form for creating and editing incident reports
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ui/Button';
import SlideoutPanel from '@/components/SlideoutPanel';
import { FormActions, FormGrid, FormSection } from '@/components/ui/FormField';
import { cn } from '@/lib/cn';
import { getPets } from '@/features/pets/api';

const INCIDENT_TYPES = [
  { value: 'injury', label: 'Injury', description: 'Physical injury to pet or person' },
  { value: 'illness', label: 'Illness', description: 'Signs of sickness or health issue' },
  { value: 'escape', label: 'Escape Attempt', description: 'Pet tried to or did escape' },
  { value: 'bite', label: 'Bite', description: 'Bite incident involving a pet' },
  { value: 'fight', label: 'Fight', description: 'Altercation between pets' },
  { value: 'property_damage', label: 'Property Damage', description: 'Damage to facility or property' },
  { value: 'behavior', label: 'Behavior Issue', description: 'Excessive barking, anxiety, etc.' },
  { value: 'other', label: 'Other', description: 'Other incident type' },
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
      petId: '',
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
      reset({
        petId: incident.petId || '',
        incidentType: incident.incidentType || '',
        severity: incident.severity || 'LOW',
        title: incident.title || '',
        description: incident.description || '',
        incidentDate: incident.incidentDate
          ? new Date(incident.incidentDate).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
        location: incident.location || '',
        staffWitness: incident.staffWitness || '',
        immediateActions: incident.immediateActions || '',
        vetContacted: incident.vetContacted || false,
        vetName: incident.vetName || '',
        medicalTreatment: incident.medicalTreatment || '',
      });
    } else if (open) {
      reset({
        petId: preselectedPet?.id || '',
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
              <select
                {...register('incidentType', { required: 'Type is required' })}
                className={inputClass}
                style={{
                  ...inputStyles,
                  borderColor: errors.incidentType ? 'var(--bb-color-status-negative)' : 'var(--bb-color-border-subtle)',
                }}
              >
                <option value="">Select type...</option>
                {INCIDENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
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
              <select
                {...register('severity', { required: 'Severity is required' })}
                className={inputClass}
                style={inputStyles}
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
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
              Pet Involved
            </label>
            <select
              {...register('petId')}
              className={inputClass}
              style={inputStyles}
              disabled={loadingPets}
            >
              <option value="">Select pet (optional)</option>
              {pets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} ({pet.breed || pet.species})
                </option>
              ))}
            </select>
            {loadingPets && (
              <p className="text-xs" style={{ color: 'var(--bb-color-text-muted)' }}>
                Loading pets...
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

