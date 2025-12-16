/**
 * PropertyValueInput - Dynamic value input based on property type
 * Renders the appropriate input component for text, number, date, boolean, enum, etc.
 */
import Select from 'react-select';
import { cn } from '@/lib/cn';

// Dark theme styles for React Select
const darkSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-body)',
    borderColor: state.isFocused
      ? 'var(--bb-color-accent)'
      : 'var(--bb-color-border-subtle)',
    borderRadius: '0.375rem',
    minHeight: '2rem',
    boxShadow: 'none',
    '&:hover': {
      borderColor: 'var(--bb-color-border-hover)',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-elevated)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.375rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    zIndex: 50,
  }),
  menuList: (base) => ({
    ...base,
    padding: '0.25rem',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused
      ? 'var(--bb-color-bg-surface)'
      : 'transparent',
    color: 'var(--bb-color-text-primary)',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: 'var(--bb-color-bg-surface)',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-accent-soft)',
    borderRadius: '0.25rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
    fontSize: '0.75rem',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--bb-color-text-secondary)',
    '&:hover': {
      backgroundColor: 'var(--bb-color-accent)',
      color: 'white',
    },
  }),
  input: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
    fontSize: '0.875rem',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
    padding: '0.25rem',
    '&:hover': {
      color: 'var(--bb-color-text-secondary)',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--bb-color-text-tertiary)',
    padding: '0.25rem',
    '&:hover': {
      color: 'var(--bb-color-text-secondary)',
    },
  }),
};

// Operators that need simple days input (number only) instead of date picker
const DAYS_OPERATORS = [
  'is_less_than_days_ago',
  'is_more_than_days_ago',
  'is_less_than_days_from_now',
  'is_more_than_days_from_now',
];

// Base input classes
const inputClasses = cn(
  "w-full h-8 px-2 rounded",
  "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
  "text-sm text-[var(--bb-color-text-primary)]",
  "placeholder:text-[var(--bb-color-text-tertiary)]",
  "focus:outline-none focus:border-[var(--bb-color-accent)]"
);

/**
 * PropertyValueInput component
 * Renders appropriate input based on property type
 *
 * @param {Object} property - Property definition with name, label, type, options
 * @param {any} value - Current value
 * @param {Function} onChange - Callback when value changes
 * @param {string} placeholder - Optional placeholder text
 * @param {string} operator - Optional operator (some operators don't need value input)
 */
export default function PropertyValueInput({
  property,
  value,
  onChange,
  placeholder = 'Enter value...',
  operator,
}) {
  // If no property is selected, show disabled placeholder
  if (!property) {
    return (
      <input
        type="text"
        className={cn(inputClasses, 'cursor-not-allowed opacity-50')}
        placeholder="Select a field first..."
        disabled
      />
    );
  }

  // Some operators don't need a value input (is_known, is_unknown, is_true, is_false)
  const noValueOperators = ['is_known', 'is_unknown', 'is_true', 'is_false', 'is_empty', 'is_not_empty'];
  if (operator && noValueOperators.includes(operator)) {
    return null;
  }

  const fieldType = property.type || property.fieldType || 'text';

  switch (fieldType) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
      return (
        <input
          type="text"
          className={inputClasses}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'number':
    case 'currency':
      return (
        <input
          type="number"
          className={inputClasses}
          placeholder="Enter number..."
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'date':
      // For "X days ago/from now" operators, show number input instead of date picker
      if (operator && DAYS_OPERATORS.includes(operator)) {
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              className={inputClasses}
              placeholder="7"
              value={value || ''}
              onChange={(e) => onChange(parseInt(e.target.value) || '')}
            />
            <span className="text-sm text-[var(--bb-color-text-tertiary)] whitespace-nowrap">days</span>
          </div>
        );
      }
      return (
        <input
          type="date"
          className={inputClasses}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'datetime':
      return (
        <input
          type="datetime-local"
          className={inputClasses}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'boolean':
      return (
        <Select
          options={[
            { value: 'true', label: 'True' },
            { value: 'false', label: 'False' },
          ]}
          value={
            value !== undefined && value !== null && value !== ''
              ? { value: String(value), label: value === 'true' || value === true ? 'True' : 'False' }
              : null
          }
          onChange={(selected) => onChange(selected?.value)}
          placeholder="Select..."
          styles={darkSelectStyles}
          isClearable
          menuPlacement="auto"
        />
      );

    case 'enum':
    case 'single_select': {
      // property.options should contain the enum values
      const enumOptions = (property.options || []).map((opt) => ({
        value: typeof opt === 'object' ? opt.value : opt,
        label: typeof opt === 'object' ? opt.label : opt,
      }));

      return (
        <Select
          options={enumOptions}
          value={enumOptions.find((o) => o.value === value) || null}
          onChange={(selected) => onChange(selected?.value)}
          placeholder="Select..."
          styles={darkSelectStyles}
          isClearable
          menuPlacement="auto"
        />
      );
    }

    case 'multi_enum':
    case 'multi_select': {
      const multiOptions = (property.options || []).map((opt) => ({
        value: typeof opt === 'object' ? opt.value : opt,
        label: typeof opt === 'object' ? opt.label : opt,
      }));
      const selectedValues = Array.isArray(value) ? value : [];

      return (
        <Select
          isMulti
          options={multiOptions}
          value={multiOptions.filter((o) => selectedValues.includes(o.value))}
          onChange={(selected) => onChange(selected ? selected.map((s) => s.value) : [])}
          placeholder="Select values..."
          styles={darkSelectStyles}
          isClearable
          menuPlacement="auto"
        />
      );
    }

    default:
      // Default to text input for unknown types
      return (
        <input
          type="text"
          className={inputClasses}
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

