/**
 * StyledSelect Component - React Select with BarkBase theme
 * Replaces native select elements with searchable, clearable dropdowns
 */
import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

// Custom styles for react-select to match dark theme
const getSelectStyles = (error) => ({
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: error
      ? 'var(--bb-color-status-negative)'
      : state.isFocused
        ? 'var(--bb-color-accent)'
        : 'var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    minHeight: '40px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    },
    cursor: 'pointer',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.5rem',
    zIndex: 9999,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
    maxHeight: '200px',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
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
    borderRadius: '0.375rem',
    padding: '8px 12px',
    fontSize: '0.875rem',
    '&:active': {
      backgroundColor: 'var(--bb-color-accent)',
    },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-muted)',
    borderRadius: '0.375rem',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
    padding: '2px 6px',
    fontSize: '0.875rem',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    borderRadius: '0 0.375rem 0.375rem 0',
    '&:hover': {
      backgroundColor: 'var(--bb-color-status-negative)',
      color: 'white',
    },
  }),
  input: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
    fontSize: '0.875rem',
  }),
  placeholder: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    fontSize: '0.875rem',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'var(--bb-color-text-primary)',
    fontSize: '0.875rem',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    padding: '8px',
    transition: 'transform 0.2s',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    '&:hover': {
      color: 'var(--bb-color-text-primary)',
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    padding: '8px',
    '&:hover': {
      color: 'var(--bb-color-status-negative)',
    },
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    fontSize: '0.875rem',
  }),
  loadingMessage: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    fontSize: '0.875rem',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '2px 12px',
  }),
  group: (base) => ({
    ...base,
    paddingTop: 0,
    paddingBottom: 0,
  }),
  groupHeading: (base) => ({
    ...base,
    color: 'var(--bb-color-text-muted)',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    padding: '8px 12px 4px',
  }),
});

/**
 * StyledSelect - A themed React Select component
 *
 * @param {Object} props
 * @param {string} props.label - Optional label text
 * @param {string} props.error - Error message (also shows error styling)
 * @param {string} props.helpText - Help text shown below select
 * @param {Array} props.options - Array of { value, label } objects
 * @param {*} props.value - Current value (single value or array for multi)
 * @param {Function} props.onChange - Called with selected option(s)
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.isMulti - Enable multi-select
 * @param {boolean} props.isClearable - Show clear button (default: true)
 * @param {boolean} props.isSearchable - Enable search (default: true)
 * @param {boolean} props.isDisabled - Disable the select
 * @param {boolean} props.isLoading - Show loading state
 * @param {boolean} props.required - Show required indicator
 * @param {boolean} props.creatable - Allow creating new options
 * @param {boolean} props.menuPortalTarget - Portal target for menu (use document.body for modals)
 */
const StyledSelect = React.forwardRef(({
  label,
  error,
  helpText,
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  isMulti = false,
  isClearable = true,
  isSearchable = true,
  isDisabled = false,
  isLoading = false,
  required = false,
  creatable = false,
  menuPortalTarget,
  className,
  id,
  name,
  ...props
}, ref) => {
  const SelectComponent = creatable ? CreatableSelect : Select;

  // Convert simple value to option format if needed
  const getValue = () => {
    if (value === null || value === undefined || value === '') return null;

    if (isMulti) {
      if (Array.isArray(value)) {
        // If value is array of primitives, find matching options
        if (value.length > 0 && typeof value[0] !== 'object') {
          return options.filter(opt => value.includes(opt.value));
        }
        return value;
      }
      return [];
    }

    // Single select
    if (typeof value === 'object' && value !== null) {
      return value;
    }
    // Find option by value
    return options.find(opt => opt.value === value) || null;
  };

  const handleChange = (selected) => {
    if (onChange) {
      if (isMulti) {
        // Return array of values or the full option objects based on what's expected
        onChange(selected || []);
      } else {
        // Return the single value or null
        onChange(selected);
      }
    }
  };

  return (
    <div className={`w-full space-y-2 ${className || ''}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium"
          style={{ color: 'var(--bb-color-text-primary)' }}
        >
          {label}
          {required && (
            <span style={{ color: 'var(--bb-color-status-negative)' }} className="ml-1">*</span>
          )}
        </label>
      )}
      <SelectComponent
        ref={ref}
        inputId={id}
        name={name}
        aria-label={label || placeholder || 'Select option'}
        options={options}
        value={getValue()}
        onChange={handleChange}
        placeholder={placeholder}
        isMulti={isMulti}
        isClearable={isClearable}
        isSearchable={isSearchable}
        isDisabled={isDisabled}
        isLoading={isLoading}
        styles={getSelectStyles(error)}
        classNamePrefix="styled-select"
        menuPortalTarget={menuPortalTarget}
        menuPosition="fixed"
        noOptionsMessage={() => "No options found"}
        loadingMessage={() => "Loading..."}
        {...props}
      />
      {error && (
        <p className="text-sm" style={{ color: 'var(--bb-color-status-negative)' }}>
          {error}
        </p>
      )}
      {helpText && !error && (
        <p className="text-sm" style={{ color: 'var(--bb-color-text-muted)' }}>
          {helpText}
        </p>
      )}
    </div>
  );
});

StyledSelect.displayName = 'StyledSelect';

// Export the raw styles for cases where direct react-select usage is needed
export const selectStyles = getSelectStyles;

export default StyledSelect;
