/**
 * CreatableSelect Component
 *
 * A React Select wrapper that allows creating new options on the fly.
 * When a user types a value that doesn't exist, shows "Add [value]" option.
 * On selection, calls onCreate to persist the new option via API.
 */

import React, { useState, useCallback } from 'react';
import CreatableSelectBase from 'react-select/creatable';
import toast from 'react-hot-toast';
import { selectStyles } from './StyledSelect';

const CreatableSelect = React.forwardRef(({
  label,
  error,
  helpText,
  options = [],
  value,
  onChange,
  onCreate,
  placeholder = 'Select or type to add...',
  isClearable = true,
  isSearchable = true,
  isDisabled = false,
  isLoading: externalLoading = false,
  required = false,
  menuPortalTarget,
  formatCreateLabel,
  className,
  id,
  name,
  ...props
}, ref) => {
  const [isCreating, setIsCreating] = useState(false);

  // Convert simple value to option format if needed
  const getValue = useCallback(() => {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'object' && value !== null) return value;
    return options.find(opt => opt.value === value) || null;
  }, [value, options]);

  // Handle selecting an existing option
  const handleChange = useCallback((selected) => {
    if (onChange) {
      // Create synthetic event for backward compatibility
      const syntheticEvent = {
        target: {
          value: selected?.value ?? '',
          name: name,
        },
      };
      onChange(syntheticEvent);
    }
  }, [onChange, name]);

  // Handle creating a new option
  const handleCreate = useCallback(async (inputValue) => {
    if (!onCreate) {
      console.warn('CreatableSelect: onCreate callback not provided');
      return;
    }

    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;

    // Check if label already exists (case-insensitive)
    const exists = options.some(
      opt => opt.label?.toLowerCase() === trimmedValue.toLowerCase()
    );
    if (exists) {
      const existingOption = options.find(
        opt => opt.label?.toLowerCase() === trimmedValue.toLowerCase()
      );
      handleChange(existingOption);
      return;
    }

    setIsCreating(true);
    try {
      // Call the onCreate callback to persist to database
      const newOption = await onCreate(trimmedValue);

      // Select the newly created option
      if (newOption) {
        handleChange(newOption);
        toast.success(`Added "${trimmedValue}"`);
      }
    } catch (error) {
      console.error('Failed to create option:', error);
      toast.error(error.message || `Failed to add "${trimmedValue}"`);
    } finally {
      setIsCreating(false);
    }
  }, [onCreate, options, handleChange]);

  // Custom format for the "Create" option
  const defaultFormatCreateLabel = useCallback((inputValue) => {
    return `Add "${inputValue}"`;
  }, []);

  const isLoading = externalLoading || isCreating;

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
      <CreatableSelectBase
        ref={ref}
        inputId={id}
        name={name}
        aria-label={label || placeholder || 'Select or create option'}
        options={options}
        value={getValue()}
        onChange={handleChange}
        onCreateOption={handleCreate}
        placeholder={placeholder}
        isClearable={isClearable}
        isSearchable={isSearchable}
        isDisabled={isDisabled || isCreating}
        isLoading={isLoading}
        styles={selectStyles(error)}
        classNamePrefix="styled-select"
        menuPortalTarget={menuPortalTarget}
        menuPosition="fixed"
        formatCreateLabel={formatCreateLabel || defaultFormatCreateLabel}
        noOptionsMessage={() => "Type to add a new option"}
        loadingMessage={() => isCreating ? "Adding..." : "Loading..."}
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

CreatableSelect.displayName = 'CreatableSelect';

export default CreatableSelect;
