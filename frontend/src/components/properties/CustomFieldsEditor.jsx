/**
 * =============================================================================
 * CustomFieldsEditor Component
 * =============================================================================
 *
 * A form component for editing custom property values on any entity.
 * Use this component in Pet, Owner, Booking, Staff detail views to display
 * and edit custom fields.
 *
 * Usage:
 *   <CustomFieldsEditor
 *     entityType="pet"
 *     entityId={pet.id}
 *   />
 *
 * =============================================================================
 */

import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { usePropertyValuesQuery, useUpsertPropertyValuesMutation } from '@/features/settings/api';
import {
  AlertCircle,
  AlignLeft,
  Calendar,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  Clock,
  DollarSign,
  Hash,
  Link,
  Loader2,
  Mail,
  Phone,
  Save,
  Type,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

// Field type icons mapping
const FIELD_ICONS = {
  text: Type,
  textarea: AlignLeft,
  number: Hash,
  currency: DollarSign,
  date: Calendar,
  datetime: Clock,
  select: ChevronDown,
  multiselect: CheckSquare,
  boolean: CheckCircle,
  email: Mail,
  phone: Phone,
  url: Link,
};

/**
 * Render the appropriate input for a field type
 */
const FieldInput = ({ property, value, onChange, error }) => {
  const { fieldType, options = [], required, label } = property;

  const baseInputClass = `w-full rounded-lg border bg-white dark:bg-surface-primary px-3 py-2 text-sm
    focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
    ${error ? 'border-red-500' : 'border-gray-300 dark:border-surface-border'}`;

  switch (fieldType) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
      return (
        <input
          type={fieldType === 'email' ? 'email' : fieldType === 'url' ? 'url' : 'text'}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
          placeholder={`Enter ${label.toLowerCase()}`}
          required={required}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${baseInputClass} min-h-[80px] resize-y`}
          placeholder={`Enter ${label.toLowerCase()}`}
          required={required}
          rows={3}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
          className={baseInputClass}
          placeholder="0"
          required={required}
        />
      );

    case 'currency':
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-text-tertiary">$</span>
          <input
            type="number"
            step="0.01"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            className={`${baseInputClass} pl-7`}
            placeholder="0.00"
            required={required}
          />
        </div>
      );

    case 'date':
      return (
        <input
          type="date"
          value={value ? value.split('T')[0] : ''}
          onChange={(e) => onChange(e.target.value || null)}
          className={baseInputClass}
          required={required}
        />
      );

    case 'datetime':
      return (
        <input
          type="datetime-local"
          value={value ? value.slice(0, 16) : ''}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
          className={baseInputClass}
          required={required}
        />
      );

    case 'select':
      return (
        <StyledSelect
          options={[
            { value: '', label: `Select ${label.toLowerCase()}` },
            ...options.map((opt) => ({ value: opt.value, label: opt.label })),
          ]}
          value={value ?? ''}
          onChange={(opt) => onChange(opt?.value || null)}
          isClearable={false}
          isSearchable={options.length > 6}
        />
      );

    case 'multiselect':
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedValues.includes(opt.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onChange([...selectedValues, opt.value]);
                  } else {
                    onChange(selectedValues.filter((v) => v !== opt.value));
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-text-primary">{opt.label}</span>
            </label>
          ))}
        </div>
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-text-primary">
            {value ? 'Yes' : 'No'}
          </span>
        </label>
      );

    default:
      return (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      );
  }
};

/**
 * Main CustomFieldsEditor component
 */
const CustomFieldsEditor = ({
  entityType,
  entityId,
  onSave,
  autoSave = false,
  showSaveButton = true,
  className = '',
  groupBySection = true,
}) => {
  const [localValues, setLocalValues] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch property values
  const { data, isLoading, error } = usePropertyValuesQuery(entityType, entityId);

  // Upsert mutation
  const upsertMutation = useUpsertPropertyValuesMutation();

  // Initialize local values from fetched data
  useEffect(() => {
    if (data?.values) {
      setLocalValues(data.values);
      setHasChanges(false);
    }
  }, [data?.values]);

  // Properties with their values
  const properties = data?.properties || [];

  // Group properties by section
  const groupedProperties = useMemo(() => {
    if (!groupBySection) {
      return { 'Custom Fields': properties };
    }

    const groups = {};
    properties.forEach((prop) => {
      const group = prop.propertyGroup || 'General';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(prop);
    });
    return groups;
  }, [properties, groupBySection]);

  // Handle value change
  const handleChange = (propertyName, value) => {
    setLocalValues((prev) => ({
      ...prev,
      [propertyName]: value,
    }));
    setHasChanges(true);

    // Clear validation error for this field
    if (validationErrors[propertyName]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[propertyName];
        return next;
      });
    }

    // Auto-save if enabled
    if (autoSave) {
      handleSave({ [propertyName]: value });
    }
  };

  // Validate required fields
  const validate = () => {
    const errors = {};
    properties.forEach((prop) => {
      if (prop.required) {
        const value = localValues[prop.name];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
          errors[prop.name] = `${prop.label} is required`;
        }
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save handler
  const handleSave = async (valuesToSave = localValues) => {
    if (!autoSave && !validate()) {
      return;
    }

    try {
      await upsertMutation.mutateAsync({
        entityType,
        entityId,
        values: valuesToSave,
      });
      setHasChanges(false);
      onSave?.(valuesToSave);
    } catch (err) {
      console.error('Failed to save custom fields:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500 dark:text-text-secondary">Loading custom fields...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center py-8 text-red-500 ${className}`}>
        <AlertCircle className="h-5 w-5 mr-2" />
        <span className="text-sm">Failed to load custom fields</span>
      </div>
    );
  }

  // No properties defined
  if (properties.length === 0) {
    return (
      <div className={`py-4 text-center ${className}`}>
        <p className="text-sm text-gray-500 dark:text-text-secondary">
          No custom fields defined for {entityType}s.
        </p>
        <p className="text-xs text-gray-400 dark:text-text-tertiary mt-1">
          Admins can create custom fields in Settings &gt; Properties.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(groupedProperties).map(([groupName, groupProps]) => (
        <div key={groupName} className="space-y-4">
          {groupBySection && Object.keys(groupedProperties).length > 1 && (
            <h3 className="text-sm font-medium text-gray-700 dark:text-text-primary border-b border-gray-200 dark:border-surface-border pb-2">
              {groupName}
            </h3>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupProps.map((property) => {
              const Icon = FIELD_ICONS[property.fieldType] || Type;
              const error = validationErrors[property.name];

              return (
                <div key={property.id} className="space-y-1">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-text-primary">
                    <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-text-tertiary" />
                    {property.label}
                    {property.required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </label>

                  <FieldInput
                    property={property}
                    value={localValues[property.name]}
                    onChange={(value) => handleChange(property.name, value)}
                    error={error}
                  />

                  {error && (
                    <p className="text-xs text-red-500 mt-1">{error}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save button */}
      {showSaveButton && hasChanges && (
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-surface-border">
          <Button
            onClick={() => handleSave()}
            disabled={upsertMutation.isPending}
            className="flex items-center gap-2"
          >
            {upsertMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Custom Fields
          </Button>
        </div>
      )}

      {/* Save error */}
      {upsertMutation.isError && (
        <div className="flex items-center gap-2 text-sm text-red-500 mt-2">
          <AlertCircle className="h-4 w-4" />
          Failed to save. Please try again.
        </div>
      )}
    </div>
  );
};

export default CustomFieldsEditor;
