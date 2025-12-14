import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Plus, Trash2, Settings } from 'lucide-react';
import Select from 'react-select';
import Button from '@/components/ui/Button';

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

const EnhancedCreatePropertyModal = ({ isOpen, onClose, objectType, existingProperty, onSubmit }) => {
  const [formData, setFormData] = useState({
    objectType,
    name: '',
    label: '',
    description: '',
    type: 'string',
    required: false,
    showOnBookingForm: true,
    showOnProfileSummary: true,
    staffOnly: false,
    accessLevel: 'all',
    options: [],
    group: 'Basic Information'
  });
  const [showPreview, setShowPreview] = useState(false);
  const [newOption, setNewOption] = useState('');

  const fieldTypes = [
    { value: 'string', label: 'Single-line text', description: 'Short answers like names or phone numbers' },
    { value: 'text', label: 'Long text (paragraphs)', description: 'Notes, descriptions, or detailed information' },
    { value: 'enum', label: 'Dropdown select', description: 'Choose one option from a list' },
    { value: 'multi_enum', label: 'Multi-select checkboxes', description: 'Select multiple options' },
    { value: 'boolean', label: 'Yes/No toggle', description: 'Simple true/false questions' },
    { value: 'date', label: 'Date picker', description: 'Birth dates, vaccination dates' },
    { value: 'number', label: 'Number', description: 'Quantities, ages, measurements' },
    { value: 'file', label: 'File upload', description: 'Photos, documents, certificates' }
  ];

  const accessLevels = [
    { value: 'all', label: 'All staff' },
    { value: 'managers', label: 'Managers only' },
    { value: 'specific', label: 'Specific roles' }
  ];

  const suggestedGroups = {
    pets: ['Basic Information', 'Medical & Health', 'Behavior & Temperament', 'Food & Diet', 'Emergency Contacts', 'Accommodations', 'Services'],
    owners: ['Basic Information', 'Contact Preferences', 'Membership', 'Emergency Contacts', 'Preferences'],
    bookings: ['Basic Information', 'Services', 'Accommodations', 'Special Requests', 'Authorization']
  };

  useEffect(() => {
    if (existingProperty) {
      setFormData({
        ...existingProperty,
        objectType
      });
    } else {
      setFormData(prev => ({
        ...prev,
        objectType,
        name: '',
        label: '',
        description: '',
        type: 'string',
        required: false,
        showOnBookingForm: true,
        showOnProfileSummary: true,
        staffOnly: false,
        accessLevel: 'all',
        options: [],
        group: suggestedGroups[objectType]?.[0] || 'Basic Information'
      }));
    }
  }, [existingProperty, objectType]);

  const generateInternalName = (label) => {
    return label.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleLabelChange = (e) => {
    const label = e.target.value;
    setFormData(prev => ({
      ...prev,
      label,
      name: generateInternalName(label)
    }));
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, newOption.trim()]
      }));
      setNewOption('');
    }
  };

  const handleRemoveOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderFieldPreview = () => {
    const { label, type, required, options } = formData;

    return (
      <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-text-primary mb-4">PREVIEW</h4>
        <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
          See how this will look to staff and customers
        </p>

        {/* Staff View */}
        <div className="mb-6">
          <h5 className="font-medium text-gray-800 dark:text-text-primary mb-2">Staff View (on {objectType.slice(0, -1)} profile):</h5>
          <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded p-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
              {label} {required && <span className="text-red-500">*</span>}
            </label>

            {type === 'string' && (
              <input
                type="text"
                placeholder="Enter value..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                disabled
              />
            )}

            {type === 'text' && (
              <textarea
                placeholder="Enter detailed information..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                disabled
              />
            )}

            {type === 'enum' && (
              <Select
                options={[
                  { value: '', label: 'Select an option...' },
                  ...options.map((option) => ({ value: option, label: option })),
                ]}
                isDisabled={true}
                isClearable={false}
                styles={selectStyles}
              />
            )}

            {type === 'multi_enum' && (
              <div className="space-y-2">
                {options.map((option, index) => (
                  <label key={index} className="flex items-center gap-2">
                    <input type="checkbox" disabled />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {type === 'boolean' && (
              <label className="flex items-center gap-2">
                <input type="checkbox" disabled />
                <span className="text-sm">{label}</span>
              </label>
            )}

            {type === 'date' && (
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                disabled
              />
            )}

            {type === 'number' && (
              <input
                type="number"
                placeholder="Enter number..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                disabled
              />
            )}

            {type === 'file' && (
              <div className="border-2 border-dashed border-gray-300 dark:border-surface-border rounded-md p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-text-secondary">Drop files here or click to upload</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer View (if applicable) */}
        {!formData.staffOnly && (objectType === 'bookings' || objectType === 'pets') && (
          <div>
            <h5 className="font-medium text-gray-800 dark:text-text-primary mb-2">
              Customer View (on {objectType === 'bookings' ? 'booking form' : 'profile'}):
            </h5>
            <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded p-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                {label} {required && <span className="text-red-500">*</span>}
              </label>

              {type === 'string' && (
                <input
                  type="text"
                  placeholder="Enter value..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                  disabled
                />
              )}

              {type === 'enum' && (
                <Select
                  options={[
                    { value: '', label: 'Select an option...' },
                    ...options.map((option) => ({ value: option, label: option })),
                  ]}
                  isDisabled={true}
                  isClearable={false}
                  styles={selectStyles}
                />
              )}

              {type === 'multi_enum' && (
                <div className="space-y-2">
                  {options.slice(0, 3).map((option, index) => (
                    <label key={index} className="flex items-center gap-2">
                      <input type="checkbox" disabled />
                      <span className="text-sm">{option}</span>
                    </label>
                  ))}
                  {options.length > 3 && (
                    <p className="text-xs text-gray-500 dark:text-text-secondary">+{options.length - 3} more options...</p>
                  )}
                </div>
              )}

              {type === 'boolean' && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" disabled />
                  <span className="text-sm">{label}</span>
                </label>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">
                {existingProperty ? 'Edit Property' : 'Create Custom Property'}
              </h2>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex max-h-[calc(90vh-140px)]">
          {/* Form Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-4">Property Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                      Applies to
                    </label>
                    <Select
                      options={[
                        { value: 'pets', label: 'Pets' },
                        { value: 'owners', label: 'Owners' },
                        { value: 'bookings', label: 'Bookings' },
                        { value: 'invoices', label: 'Invoices' },
                        { value: 'payments', label: 'Payments' },
                        { value: 'tickets', label: 'Tickets' },
                      ]}
                      value={[
                        { value: 'pets', label: 'Pets' },
                        { value: 'owners', label: 'Owners' },
                        { value: 'bookings', label: 'Bookings' },
                        { value: 'invoices', label: 'Invoices' },
                        { value: 'payments', label: 'Payments' },
                        { value: 'tickets', label: 'Tickets' },
                      ].find(o => o.value === formData.objectType) || null}
                      onChange={(opt) => setFormData(prev => ({ ...prev, objectType: opt?.value || 'pets' }))}
                      isClearable={false}
                      isSearchable
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={handleLabelChange}
                      placeholder="Dietary Restrictions"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                      This will appear on {formData.objectType.slice(0, -1)} profiles and forms
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                      Internal Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="dietary_restrictions"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">Auto-generated for API/exports</p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Track food allergies and special diet requirements"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                    Helpful for staff to understand when to use this field
                  </p>
                </div>
              </div>

              {/* Field Type */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-4">Field Type</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.type === type.value ? 'border-blue-500 bg-blue-50 dark:bg-surface-primary' : 'border-gray-200 dark:border-surface-border hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fieldType"
                        value={type.value}
                        checked={formData.type === type.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value, options: [] }))}
                        className="sr-only"
                      />
                      <div className="font-medium text-gray-900 dark:text-text-primary">{type.label}</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary mt-1">{type.description}</div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Options (for select fields) */}
              {(formData.type === 'enum' || formData.type === 'multi_enum') && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-4">Dropdown Options</h3>

                  <div className="space-y-2 mb-4">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[index] = e.target.value;
                            setFormData(prev => ({ ...prev, options: newOptions }));
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:bg-surface-primary rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      placeholder="Add new option..."
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                    />
                    <Button type="button" onClick={handleAddOption} size="sm">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Display Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-4">Display Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.showOnBookingForm}
                        onChange={(e) => setFormData(prev => ({ ...prev, showOnBookingForm: e.target.checked }))}
                      />
                      <span className="text-sm">Show on booking forms</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.showOnProfileSummary}
                        onChange={(e) => setFormData(prev => ({ ...prev, showOnProfileSummary: e.target.checked }))}
                      />
                      <span className="text-sm">Show on profile summary</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.required}
                        onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                      />
                      <span className="text-sm">Required field</span>
                    </label>

                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.staffOnly}
                        onChange={(e) => setFormData(prev => ({ ...prev, staffOnly: e.target.checked }))}
                      />
                      <span className="text-sm">Staff-only field (hide from customers)</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                      Property Group
                    </label>
                    <Select
                      options={(suggestedGroups[formData.objectType] || []).map((group) => ({
                        value: group,
                        label: group,
                      }))}
                      value={(suggestedGroups[formData.objectType] || []).map((group) => ({
                        value: group,
                        label: group,
                      })).find(o => o.value === formData.group) || null}
                      onChange={(opt) => setFormData(prev => ({ ...prev, group: opt?.value || suggestedGroups[formData.objectType]?.[0] || 'Basic Information' }))}
                      isClearable={false}
                      isSearchable
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                    />
                  </div>
                </div>
              </div>

              {/* Access Control */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-4">Access Control</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                    Who can edit this field?
                  </label>
                  <div className="space-y-2">
                    {accessLevels.map((level) => (
                      <label key={level.value} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="accessLevel"
                          value={level.value}
                          checked={formData.accessLevel === level.value}
                          onChange={(e) => setFormData(prev => ({ ...prev, accessLevel: e.target.value }))}
                        />
                        <span className="text-sm">{level.label}</span>
                      </label>
                    ))}
                  </div>

                  {formData.accessLevel === 'specific' && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded">
                      <p className="text-sm text-gray-600 dark:text-text-secondary">Select specific roles that can edit this field</p>
                      {/* Role selection would go here */}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-surface-border">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit">
                  {existingProperty ? 'Update Property' : 'Create Property'}
                </Button>
              </div>
            </form>
          </div>

          {/* Preview Panel */}
          <div className="w-96 border-l border-gray-200 dark:border-surface-border p-6 bg-gray-50 dark:bg-surface-secondary">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900 dark:text-text-primary">Live Preview</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPreview ? 'Hide' : 'Show'}
                </Button>
              </div>

              {showPreview && renderFieldPreview()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedCreatePropertyModal;
