/**
 * Create/Edit Property Modal - Phase 15 Slideout Pattern
 * Uses SlideoutPanel for edit/create flows.
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SlideoutPanel from '@/components/SlideoutPanel';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { cn } from '@/lib/cn';

// Field type categories and definitions
const FIELD_TYPE_CATEGORIES = {
  'Text Input': [
    { value: 'string', label: 'Single-line text', description: 'Short text input (max 65,536 characters)' },
    { value: 'text', label: 'Multi-line text', description: 'Long text with multiple lines' },
    { value: 'phone', label: 'Phone number', description: 'Phone number with formatting' },
  ],
  'Selection': [
    { value: 'boolean', label: 'Single checkbox', description: 'True/false or on/off value' },
    { value: 'multi_enum', label: 'Multiple checkboxes', description: 'Multiple options can be selected' },
    { value: 'enum', label: 'Dropdown select', description: 'Single option from a list' },
    { value: 'radio', label: 'Radio select', description: 'Single option displayed as radio buttons' },
  ],
  'Date & Time': [
    { value: 'date', label: 'Date picker', description: 'Select a date' },
    { value: 'datetime', label: 'Date and time picker', description: 'Select date and time' },
  ],
  'Values': [
    { value: 'number', label: 'Number', description: 'Numeric value with formatting options' },
    { value: 'currency', label: 'Currency', description: 'Monetary value' },
    { value: 'calculation', label: 'Calculation', description: 'Calculated from other properties' },
    { value: 'rollup', label: 'Rollup', description: 'Aggregate values from associated records' },
    { value: 'score', label: 'Score (legacy)', description: 'Custom scoring attributes' },
  ],
  'Other': [
    { value: 'sync', label: 'Property sync', description: 'Sync value from associated record' },
    { value: 'file', label: 'File', description: 'Upload files (up to 10 per property)' },
    { value: 'user', label: 'User', description: 'Select users from your account' },
    { value: 'url', label: 'URL', description: 'Web link with validation' },
    { value: 'rich_text', label: 'Rich text', description: 'Formatted text with styling' },
    { value: 'email', label: 'Email', description: 'Email address with validation' },
  ],
};

// Number format options
const NUMBER_FORMATS = [
  { value: 'formatted', label: 'Formatted', description: 'With commas (e.g., 1,000,000)' },
  { value: 'unformatted', label: 'Unformatted', description: 'No formatting (e.g., 1000000)' },
  { value: 'percentage', label: 'Percentage', description: 'As percentage (e.g., 90%)' },
  { value: 'duration', label: 'Duration', description: 'Time duration' },
];

const PROPERTY_GROUPS = [
  { value: 'basic_info', label: 'Basic Information' },
  { value: 'contact_info', label: 'Contact Information' },
  { value: 'custom_fields', label: 'Custom Fields' },
  { value: 'identification', label: 'Identification' },
  { value: 'medical', label: 'Medical Information' },
  { value: 'financial', label: 'Financial' },
  { value: 'status', label: 'Status' },
  { value: 'notes', label: 'Notes' },
];

const CreatePropertyModal = ({ isOpen, onClose, onSubmit, objectType, existingProperty }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    label: '',
    name: '',
    type: '',
    group: 'custom_fields',
    description: '',
    required: false,
    options: {},
  });
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [enumOptions, setEnumOptions] = useState(['']);
  const [numberFormat, setNumberFormat] = useState('formatted');
  const [rollupConfig, setRollupConfig] = useState({
    associatedObject: '',
    propertyToRollup: '',
    rollupType: 'count',
    format: 'formatted',
  });
  const [syncConfig, setSyncConfig] = useState({
    associatedObject: '',
    propertyToSync: '',
  });
  const [urlConfig, setUrlConfig] = useState({
    allowedDomains: [],
    blockedDomains: [],
  });
  const [fileConfig, setFileConfig] = useState({
    viewPermission: 'all',
    maxFiles: 10,
  });

  const isEditing = !!existingProperty;

  useEffect(() => {
    if (existingProperty) {
      setFormData({
        label: existingProperty.label || '',
        name: existingProperty.name || '',
        type: existingProperty.type || 'string',
        group: existingProperty.group || 'custom_fields',
        required: existingProperty.required || false,
        description: existingProperty.description || '',
        options: existingProperty.options || {},
      });
      setNameManuallyEdited(true);
      setStep(1);

      if (existingProperty.options?.choices) {
        setEnumOptions(existingProperty.options.choices);
      }
    } else {
      setFormData({
        label: '',
        name: '',
        type: '',
        group: 'custom_fields',
        required: false,
        description: '',
        options: {},
      });
      setEnumOptions(['']);
      setNameManuallyEdited(false);
      setStep(1);
    }
    setError(null);
  }, [existingProperty, isOpen]);

  const handleLabelChange = useCallback((value) => {
    setFormData((prev) => {
      const updates = { ...prev, label: value };
      if (!nameManuallyEdited && !isEditing) {
        updates.name = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
      }
      return updates;
    });
  }, [nameManuallyEdited, isEditing]);

  const handleNameChange = useCallback((value) => {
    setNameManuallyEdited(true);
    setFormData((prev) => ({ ...prev, name: value }));
  }, []);

  const handleGroupChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, group: value }));
  }, []);

  const handleDescriptionChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, description: value }));
  }, []);

  const handleRequiredChange = useCallback((checked) => {
    setFormData((prev) => ({ ...prev, required: checked }));
  }, []);

  const handleTypeChange = useCallback((value) => {
    setFormData((prev) => ({ ...prev, type: value }));
  }, []);

  const handleAddEnumOption = useCallback(() => {
    setEnumOptions((prev) => [...prev, '']);
  }, []);

  const handleRemoveEnumOption = useCallback((index) => {
    setEnumOptions((prev) => {
      if (prev.length > 1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  }, []);

  const handleEnumOptionChange = useCallback((index, value) => {
    setEnumOptions((prev) => {
      const newOptions = [...prev];
      newOptions[index] = value;
      return newOptions;
    });
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      let options = {};

      if (['enum', 'multi_enum', 'radio'].includes(formData.type)) {
        options.choices = enumOptions.filter(opt => opt.trim() !== '');
      }

      if (formData.type === 'number') {
        options.format = numberFormat;
      }

      if (formData.type === 'rollup') {
        options = rollupConfig;
      }

      if (formData.type === 'sync') {
        options = syncConfig;
      }

      if (formData.type === 'url') {
        options = urlConfig;
      }

      if (formData.type === 'file') {
        options = fileConfig;
      }

      const propertyData = {
        ...formData,
        objectType: objectType,
        system: false,
        fieldConfig: options,
      };

      if (isEditing) {
        await onSubmit(existingProperty.recordId, propertyData);
      } else {
        await onSubmit(propertyData);
      }

      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    setStep(1);
    setFormData({
      label: '',
      name: '',
      type: '',
      group: 'custom_fields',
      description: '',
      required: false,
      options: {},
    });
    setEnumOptions(['']);
    setNumberFormat('formatted');
    setError(null);
    setNameManuallyEdited(false);
    onClose();
  }, [onClose]);

  const canProceedToStep2 = formData.label && formData.name;
  const canProceedToStep3 = formData.type;
  const needsConfiguration = !isEditing && ['enum', 'multi_enum', 'radio', 'number', 'rollup', 'sync', 'url', 'file'].includes(formData.type);
  const totalSteps = isEditing ? 1 : (needsConfiguration ? 3 : 2);

  return (
    <SlideoutPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Property' : 'Create Property'}
      description={!isEditing ? `Step ${step} of ${totalSteps}` : 'Update property settings and configuration.'}
      widthClass="max-w-2xl"
    >
      <div>

        {/* Step Indicators */}
        {!isEditing && (
          <div className="flex items-center gap-[var(--bb-space-2)] mb-[var(--bb-space-8)]">
            <div className={cn('flex-1 h-1 rounded-full', step >= 1 ? 'bg-[var(--bb-color-accent)]' : 'bg-[var(--bb-color-border-subtle)]')} />
            <div className={cn('flex-1 h-1 rounded-full', step >= 2 ? 'bg-[var(--bb-color-accent)]' : 'bg-[var(--bb-color-border-subtle)]')} />
            {needsConfiguration && (
              <div className={cn('flex-1 h-1 rounded-full', step >= 3 ? 'bg-[var(--bb-color-accent)]' : 'bg-[var(--bb-color-border-subtle)]')} />
            )}
          </div>
        )}

        {error && (
          <div className="mb-[var(--bb-space-4)] rounded-lg bg-[var(--bb-color-alert-danger-bg)] border border-[var(--bb-color-alert-danger-border)] p-[var(--bb-space-3)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-alert-danger-text)]">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-[var(--bb-space-6)]">
            <FormField label="Property label" required>
              <Input
                type="text"
                value={formData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g., Customer Tier, Last Visit Date"
              />
            </FormField>

            <FormField 
              label="Internal name" 
              required
              description={isEditing ? 'Cannot be changed after creation' : 'Auto-generated from label. Use lowercase and underscores.'}
            >
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="customer_tier"
                disabled={isEditing}
                className="font-mono"
              />
            </FormField>

            <FormField label="Group" required>
              <Select
                value={formData.group}
                onChange={(e) => handleGroupChange(e.target.value)}
                options={PROPERTY_GROUPS.map((group) => ({
                  value: group.value,
                  label: group.label,
                }))}
                menuPortalTarget={document.body}
              />
            </FormField>

            <FormField label="Description">
              <Textarea
                value={formData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                rows={3}
                placeholder="Help users understand what this property is for"
              />
            </FormField>

            <div className="flex items-center gap-[var(--bb-space-3)]">
              <input
                type="checkbox"
                checked={formData.required}
                onChange={(e) => handleRequiredChange(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--bb-color-border-subtle)] text-[var(--bb-color-accent)] focus:ring-[var(--bb-color-accent)]"
              />
              <label className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                Make this property required
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Field Type Selection */}
        {step === 2 && !isEditing && (
          <div className="space-y-[var(--bb-space-6)]">
            <div>
              <h3 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-4)]">
                Select field type
              </h3>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mb-[var(--bb-space-6)]">
                The field type determines how data is stored and displayed in BarkBase.
              </p>
            </div>

            <div className="space-y-[var(--bb-space-6)] max-h-96 overflow-y-auto pr-[var(--bb-space-2)]">
              {Object.entries(FIELD_TYPE_CATEGORIES).map(([category, types]) => (
                <div key={category}>
                  <h4 className="text-[var(--bb-font-size-xs)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-muted)] uppercase tracking-wider mb-[var(--bb-space-3)]">
                    {category}
                  </h4>
                  <div className="space-y-[var(--bb-space-2)]">
                    {types.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleTypeChange(type.value)}
                        className={cn(
                          'w-full text-left p-[var(--bb-space-3)] rounded-[var(--bb-radius-lg)] border transition-colors',
                          formData.type === type.value
                            ? 'border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]'
                            : 'border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] hover:border-[var(--bb-color-accent)]/50'
                        )}
                      >
                        <div className="font-[var(--bb-font-weight-medium)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                          {type.label}
                        </div>
                        <div className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] mt-[var(--bb-space-1)]">
                          {type.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Field Type Configuration */}
        {step === 3 && (
          <div className="space-y-[var(--bb-space-6)]">
            <div>
              <h3 className="text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">
                Configure {FIELD_TYPE_CATEGORIES[Object.keys(FIELD_TYPE_CATEGORIES).find(cat =>
                  FIELD_TYPE_CATEGORIES[cat].some(t => t.value === formData.type)
                )]?.find(t => t.value === formData.type)?.label}
              </h3>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)] mb-[var(--bb-space-6)]">
                Set up the specific options for this field type.
              </p>
            </div>

            {/* Enum/Multi-Enum/Radio Configuration */}
            {(['enum', 'multi_enum', 'radio'].includes(formData.type)) && (
              <div>
                <label className="block text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-3)]">
                  Options <span className="text-[var(--bb-color-status-negative)]">*</span>
                </label>
                <div className="space-y-[var(--bb-space-2)] mb-[var(--bb-space-3)]">
                  {enumOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-[var(--bb-space-2)]">
                      <Input
                        type="text"
                        value={option}
                        onChange={(e) => handleEnumOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                      />
                      {enumOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEnumOption(index)}
                          className="p-[var(--bb-space-2)] text-[var(--bb-color-text-muted)] hover:text-[var(--bb-color-status-negative)] transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEnumOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-[var(--bb-space-2)]" />
                  Add option
                </Button>
                <p className="mt-[var(--bb-space-2)] text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)]">
                  Maximum 5,000 options. Each option can be up to 3,000 characters.
                </p>
              </div>
            )}

            {/* Number Configuration */}
            {formData.type === 'number' && (
              <div>
                <label className="block text-[var(--bb-font-size-sm)] font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-3)]">
                  Number format
                </label>
                <div className="space-y-[var(--bb-space-2)]">
                  {NUMBER_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => setNumberFormat(format.value)}
                      className={cn(
                        'w-full text-left p-[var(--bb-space-3)] rounded-[var(--bb-radius-lg)] border transition-colors',
                        numberFormat === format.value
                          ? 'border-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]'
                          : 'border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)] hover:border-[var(--bb-color-accent)]/50'
                      )}
                    >
                      <div className="font-[var(--bb-font-weight-medium)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                        {format.label}
                      </div>
                      <div className="text-[var(--bb-font-size-xs)] text-[var(--bb-color-text-muted)] mt-[var(--bb-space-1)]">
                        {format.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rollup Configuration */}
            {formData.type === 'rollup' && (
              <div className="space-y-[var(--bb-space-4)]">
                <FormField label="Associated object">
                  <Select
                    value={rollupConfig.associatedObject}
                    onChange={(e) => setRollupConfig({ ...rollupConfig, associatedObject: e.target.value })}
                    options={[
                      { value: '', label: 'Select object...' },
                      { value: 'pets', label: 'Pets' },
                      { value: 'owners', label: 'Owners' },
                      { value: 'bookings', label: 'Bookings' },
                      { value: 'invoices', label: 'Invoices' },
                    ]}
                    menuPortalTarget={document.body}
                  />
                </FormField>
                <FormField label="Rollup type">
                  <Select
                    value={rollupConfig.rollupType}
                    onChange={(e) => setRollupConfig({ ...rollupConfig, rollupType: e.target.value })}
                    options={[
                      { value: 'count', label: 'Count' },
                      { value: 'sum', label: 'Sum' },
                      { value: 'average', label: 'Average' },
                      { value: 'min', label: 'Minimum' },
                      { value: 'max', label: 'Maximum' },
                    ]}
                    menuPortalTarget={document.body}
                  />
                </FormField>
              </div>
            )}

            {/* Sync Configuration */}
            {formData.type === 'sync' && (
              <div className="space-y-[var(--bb-space-4)]">
                <FormField label="Associated object">
                  <Select
                    value={syncConfig.associatedObject}
                    onChange={(e) => setSyncConfig({ ...syncConfig, associatedObject: e.target.value })}
                    options={[
                      { value: '', label: 'Select object...' },
                      { value: 'pets', label: 'Pets' },
                      { value: 'owners', label: 'Owners' },
                      { value: 'bookings', label: 'Bookings' },
                      { value: 'invoices', label: 'Invoices' },
                    ]}
                    menuPortalTarget={document.body}
                  />
                </FormField>
                <div className="p-[var(--bb-space-3)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-accent-soft)] border border-[var(--bb-color-accent)]/30">
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                    Values will automatically update when the selected property on the associated record changes.
                  </p>
                </div>
              </div>
            )}

            {/* File Configuration */}
            {formData.type === 'file' && (
              <div className="space-y-[var(--bb-space-4)]">
                <FormField label="View permission">
                  <Select
                    value={fileConfig.viewPermission}
                    onChange={(e) => setFileConfig({ ...fileConfig, viewPermission: e.target.value })}
                    options={[
                      { value: 'all', label: 'All users' },
                      { value: 'owners', label: 'Record owners only' },
                      { value: 'admins', label: 'Admins only' },
                    ]}
                    menuPortalTarget={document.body}
                  />
                </FormField>
                <div className="p-[var(--bb-space-3)] rounded-[var(--bb-radius-lg)] bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]">
                  <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-primary)]">
                    <strong>File limits:</strong> Up to 10 files per property. Max 20 MB per file (50 MB for paid accounts).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-[var(--bb-space-8)] flex items-center justify-between pt-[var(--bb-space-6)] border-t border-[var(--bb-color-border-subtle)]">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-[var(--bb-space-2)]">
            {step > 1 && !isEditing && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={loading}>
                Back
              </Button>
            )}
            {step === 1 && !isEditing && (
              <Button onClick={() => setStep(2)} disabled={!canProceedToStep2 || loading}>
                Next
              </Button>
            )}
            {step === 1 && isEditing && (
              <Button onClick={handleSubmit} disabled={loading || !canProceedToStep2}>
                {loading ? 'Saving...' : 'Update Property'}
              </Button>
            )}
            {step === 2 && !isEditing && (
              <Button
                onClick={() => {
                  if (needsConfiguration) {
                    setStep(3);
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={!canProceedToStep3 || loading}
              >
                {loading ? 'Creating...' : (needsConfiguration ? 'Next' : 'Create Property')}
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating...' : 'Create Property'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </SlideoutPanel>
  );
};

export default CreatePropertyModal;
