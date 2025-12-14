/**
 * Select Component - Phase 9 Enterprise Form System
 * Now powered by React Select for searchable, clearable dropdowns.
 */

import React from 'react';
import StyledSelect from './StyledSelect';

const Select = React.forwardRef(
  ({ className, label, error, helpText, children, options, placeholder, value, onChange, required, disabled, name, id, ...props }, ref) => {
    // Handle onChange to maintain backward compatibility with native select API
    const handleChange = (selectedOption) => {
      if (onChange) {
        // Create a synthetic event-like object for backward compatibility
        const syntheticEvent = {
          target: {
            value: selectedOption?.value ?? '',
            name: name,
          },
        };
        onChange(syntheticEvent);
      }
    };

    return (
      <StyledSelect
        ref={ref}
        id={id}
        name={name}
        label={label}
        error={error}
        helpText={helpText}
        options={options || []}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        isDisabled={disabled}
        isClearable
        isSearchable
        className={className}
        {...props}
      />
    );
  }
);

Select.displayName = 'Select';

// Create placeholder components for compatibility (these are no longer used with React Select)
const SelectTrigger = Select;
const SelectValue = ({ children, ...props }) => children;
const SelectContent = ({ children }) => children;
const SelectItem = ({ children, value, ...props }) => (
  <option value={value} {...props}>{children}</option>
);

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
export default Select;
