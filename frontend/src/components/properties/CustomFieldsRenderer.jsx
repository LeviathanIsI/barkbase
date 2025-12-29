/**
 * =============================================================================
 * CustomFieldsRenderer Component
 * =============================================================================
 *
 * A read-only component for displaying custom property values on any entity.
 * Use this component in Pet, Owner, Booking, Staff detail views to show
 * custom field values in a formatted, read-only way.
 *
 * Usage:
 *   <CustomFieldsRenderer
 *     entityType="pet"
 *     entityId={pet.id}
 *   />
 *
 * =============================================================================
 */

import { useMemo } from 'react';
import {
  Type,
  Hash,
  Calendar,
  Clock,
  ChevronDown,
  CheckSquare,
  CheckCircle,
  Link,
  Mail,
  Phone,
  DollarSign,
  AlignLeft,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { usePropertyValuesQuery } from '@/features/settings/api';
import { useTimezoneUtils } from '@/lib/timezone';

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
 * Format a value for display based on field type
 */
const formatValue = (value, fieldType, options = [], tz = null) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400 dark:text-text-tertiary italic">Not set</span>;
  }

  switch (fieldType) {
    case 'boolean':
      return (
        <span className={`inline-flex items-center gap-1 ${value ? 'text-green-600' : 'text-gray-500'}`}>
          {value ? (
            <>
              <CheckCircle className="h-3.5 w-3.5" />
              Yes
            </>
          ) : (
            'No'
          )}
        </span>
      );

    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);

    case 'number':
      return new Intl.NumberFormat('en-US').format(value);

    case 'date':
      try {
        return tz?.formatDate(value, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }) || value;
      } catch {
        return value;
      }

    case 'datetime':
      try {
        return tz?.formatDate(value, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }) || value;
      } catch {
        return value;
      }

    case 'email':
      return (
        <a
          href={`mailto:${value}`}
          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
        >
          {value}
        </a>
      );

    case 'phone':
      return (
        <a
          href={`tel:${value}`}
          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
        >
          {value}
        </a>
      );

    case 'url':
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
        >
          {value}
          <ExternalLink className="h-3 w-3" />
        </a>
      );

    case 'select':
      // Find the label for the selected option
      const selectedOption = options.find((opt) => opt.value === value);
      if (selectedOption) {
        return (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-surface-secondary text-gray-800 dark:text-text-primary"
            style={selectedOption.color ? { backgroundColor: `${selectedOption.color}20`, color: selectedOption.color } : {}}
          >
            {selectedOption.label}
          </span>
        );
      }
      return value;

    case 'multiselect':
      if (!Array.isArray(value) || value.length === 0) {
        return <span className="text-gray-400 dark:text-text-tertiary italic">None selected</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-surface-secondary text-gray-800 dark:text-text-primary"
                style={opt?.color ? { backgroundColor: `${opt.color}20`, color: opt.color } : {}}
              >
                {opt?.label || v}
              </span>
            );
          })}
        </div>
      );

    case 'textarea':
      return (
        <p className="whitespace-pre-wrap text-gray-700 dark:text-text-primary">
          {value}
        </p>
      );

    default:
      return value;
  }
};

/**
 * Single field display component
 */
const FieldDisplay = ({ property, value, tz }) => {
  const Icon = FIELD_ICONS[property.fieldType] || Type;

  return (
    <div className="space-y-1">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-text-secondary uppercase tracking-wide">
        <Icon className="h-3 w-3" />
        {property.label}
      </dt>
      <dd className="text-sm text-gray-900 dark:text-text-primary">
        {formatValue(value, property.fieldType, property.options, tz)}
      </dd>
    </div>
  );
};

/**
 * Main CustomFieldsRenderer component
 */
const CustomFieldsRenderer = ({
  entityType,
  entityId,
  className = '',
  layout = 'grid', // 'grid' | 'list' | 'inline'
  columns = 2,
  showEmptyFields = true,
  groupBySection = true,
  showHeader = true,
  compact = false,
}) => {
  const tz = useTimezoneUtils();

  // Fetch property values
  const { data, isLoading, error } = usePropertyValuesQuery(entityType, entityId);

  // Properties with their values
  const properties = data?.properties || [];
  const values = data?.values || {};

  // Filter empty fields if requested
  const filteredProperties = useMemo(() => {
    if (showEmptyFields) return properties;
    return properties.filter((prop) => {
      const value = values[prop.name];
      return value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);
    });
  }, [properties, values, showEmptyFields]);

  // Group properties by section
  const groupedProperties = useMemo(() => {
    if (!groupBySection) {
      return { 'Custom Fields': filteredProperties };
    }

    const groups = {};
    filteredProperties.forEach((prop) => {
      const group = prop.propertyGroup || 'General';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(prop);
    });
    return groups;
  }, [filteredProperties, groupBySection]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-6 ${className}`}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500 dark:text-text-secondary">Loading...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center py-6 text-red-500 ${className}`}>
        <AlertCircle className="h-4 w-4 mr-2" />
        <span className="text-sm">Failed to load custom fields</span>
      </div>
    );
  }

  // No properties or all empty
  if (filteredProperties.length === 0) {
    if (!showEmptyFields && properties.length > 0) {
      return null; // Hide completely if all fields are empty and we're not showing empty
    }
    return (
      <div className={`py-4 text-center ${className}`}>
        <p className="text-sm text-gray-500 dark:text-text-secondary">
          No custom fields defined.
        </p>
      </div>
    );
  }

  // Layout classes
  const gridClass = layout === 'grid'
    ? `grid gap-4 ${columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`
    : layout === 'inline'
    ? 'flex flex-wrap gap-x-6 gap-y-2'
    : 'space-y-3';

  return (
    <div className={`${className}`}>
      {Object.entries(groupedProperties).map(([groupName, groupProps], groupIndex) => (
        <div
          key={groupName}
          className={`${groupIndex > 0 ? 'mt-6' : ''}`}
        >
          {/* Section header */}
          {showHeader && groupBySection && Object.keys(groupedProperties).length > 1 && (
            <h4 className={`text-sm font-medium text-gray-700 dark:text-text-primary mb-3 ${compact ? '' : 'border-b border-gray-200 dark:border-surface-border pb-2'}`}>
              {groupName}
            </h4>
          )}

          {/* Fields */}
          <dl className={gridClass}>
            {groupProps.map((property) => (
              <FieldDisplay
                key={property.id}
                property={property}
                value={values[property.name]}
                tz={tz}
              />
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
};

export default CustomFieldsRenderer;
