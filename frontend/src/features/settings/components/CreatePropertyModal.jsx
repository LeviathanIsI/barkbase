import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

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
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Field Type, 3: Configure
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

  // Field type specific options
  const [enumOptions, setEnumOptions] = useState(['']);
  const [numberFormat, setNumberFormat] = useState('formatted');
  const [rollupConfig, setRollupConfig] = useState({
    associatedObject: '',
    propertyToRollup: '',
    rollupType: 'count', // count, sum, average, min, max
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
    viewPermission: 'all', // all, owners, admins
    maxFiles: 10,
  });

  const isEditing = !!existingProperty;

  // Initialize form with existing property data
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
      setStep(1); // Editing skips field type selection

      // Parse enum options if available
      if (existingProperty.options?.choices) {
        setEnumOptions(existingProperty.options.choices);
      }
    } else {
      // Reset form for new property
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

  // Auto-generate internal name from label
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
      // Prepare options based on field type
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

  // Check if field type needs configuration
  const needsConfiguration = !isEditing && ['enum', 'multi_enum', 'radio', 'number', 'rollup', 'sync', 'url', 'file'].includes(formData.type);

  const totalSteps = isEditing ? 1 : (needsConfiguration ? 3 : 2);

  return (
    <Modal open={isOpen} onClose={handleClose} size="lg">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-text mb-2">
            {isEditing ? 'Edit Property' : 'Create Property'}
          </h2>
          {!isEditing && (
            <p className="text-sm text-muted">
              Step {step} of {totalSteps}
            </p>
          )}
        </div>

        {/* Step Indicators */}
        {!isEditing && (
          <div className="flex items-center gap-2 mb-8">
            <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`} />
            <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
            {needsConfiguration && (
              <div className={`flex-1 h-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Property label <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g., Customer Tier, Last Visit Date"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Internal name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="customer_tier"
                disabled={isEditing}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-muted">
                {isEditing ? 'Cannot be changed after creation' : 'Auto-generated from label. Use lowercase and underscores.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Group <span className="text-red-600">*</span>
              </label>
              <select
                value={formData.group}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PROPERTY_GROUPS.map((group) => (
                  <option key={group.value} value={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                rows={3}
                placeholder="Help users understand what this property is for"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.required}
                onChange={(e) => handleRequiredChange(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label className="text-sm text-text">
                Make this property required
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Field Type Selection */}
        {step === 2 && !isEditing && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-text mb-4">Select field type</h3>
              <p className="text-sm text-muted mb-6">
                The field type determines how data is stored and displayed in BarkBase.
              </p>
            </div>

            <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
              {Object.entries(FIELD_TYPE_CATEGORIES).map(([category, types]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {types.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleTypeChange(type.value)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          formData.type === type.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium text-sm text-text">{type.label}</div>
                        <div className="text-xs text-muted mt-1">{type.description}</div>
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
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-text mb-2">
                Configure {FIELD_TYPE_CATEGORIES[Object.keys(FIELD_TYPE_CATEGORIES).find(cat =>
                  FIELD_TYPE_CATEGORIES[cat].some(t => t.value === formData.type)
                )]?.find(t => t.value === formData.type)?.label}
              </h3>
              <p className="text-sm text-muted mb-6">
                Set up the specific options for this field type.
              </p>
            </div>

            {/* Enum/Multi-Enum/Radio Configuration */}
            {(['enum', 'multi_enum', 'radio'].includes(formData.type)) && (
              <div>
                <label className="block text-sm font-medium text-text mb-3">
                  Options <span className="text-red-600">*</span>
                </label>
                <div className="space-y-2 mb-3">
                  {enumOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleEnumOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {enumOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEnumOption(index)}
                          className="p-2 text-muted hover:text-red-600 transition-colors"
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
                  <Plus className="h-4 w-4 mr-2" />
                  Add option
                </Button>
                <p className="mt-2 text-xs text-muted">
                  Maximum 5,000 options. Each option can be up to 3,000 characters.
                </p>
              </div>
            )}

            {/* Number Configuration */}
            {formData.type === 'number' && (
              <div>
                <label className="block text-sm font-medium text-text mb-3">
                  Number format
                </label>
                <div className="space-y-2">
                  {NUMBER_FORMATS.map((format) => (
                    <button
                      key={format.value}
                      type="button"
                      onClick={() => setNumberFormat(format.value)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        numberFormat === format.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-surface hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium text-sm text-text">{format.label}</div>
                      <div className="text-xs text-muted mt-1">{format.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rollup Configuration */}
            {formData.type === 'rollup' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Associated object
                  </label>
                  <select
                    value={rollupConfig.associatedObject}
                    onChange={(e) => setRollupConfig({ ...rollupConfig, associatedObject: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select object...</option>
                    <option value="pets">Pets</option>
                    <option value="owners">Owners</option>
                    <option value="bookings">Bookings</option>
                    <option value="invoices">Invoices</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Rollup type
                  </label>
                  <select
                    value={rollupConfig.rollupType}
                    onChange={(e) => setRollupConfig({ ...rollupConfig, rollupType: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="count">Count</option>
                    <option value="sum">Sum</option>
                    <option value="average">Average</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                  </select>
                </div>
              </div>
            )}

            {/* Sync Configuration */}
            {formData.type === 'sync' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Associated object
                  </label>
                  <select
                    value={syncConfig.associatedObject}
                    onChange={(e) => setSyncConfig({ ...syncConfig, associatedObject: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select object...</option>
                    <option value="pets">Pets</option>
                    <option value="owners">Owners</option>
                    <option value="bookings">Bookings</option>
                    <option value="invoices">Invoices</option>
                  </select>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-900">
                    Values will automatically update when the selected property on the associated record changes.
                  </p>
                </div>
              </div>
            )}

            {/* File Configuration */}
            {formData.type === 'file' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    View permission
                  </label>
                  <select
                    value={fileConfig.viewPermission}
                    onChange={(e) => setFileConfig({ ...fileConfig, viewPermission: e.target.value })}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">All users</option>
                    <option value="owners">Record owners only</option>
                    <option value="admins">Admins only</option>
                  </select>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <p className="text-sm text-text">
                    <strong>File limits:</strong> Up to 10 files per property. Max 20 MB per file (50 MB for paid accounts).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-border">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
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
    </Modal>
  );
};

export default CreatePropertyModal;
