/**
 * PropertyValueInput
 * Renders the appropriate input based on property type (text, number, date, boolean, enum)
 * Used by ConditionBuilder, TriggerConfig (property_changed), and ActionConfig (update_field)
 */
import { useState } from 'react';
import DateValueInput, { DaysInput, DateRangeInput } from './DateValueInput';

// Operators that need simple days input (number only)
const DAYS_OPERATORS = [
  'is_less_than_days_ago',
  'is_more_than_days_ago',
  'is_less_than_days_from_now',
  'is_more_than_days_from_now',
];

// Operators that need range input
const DATE_RANGE_OPERATORS = ['is_between'];

export default function PropertyValueInput({
  property,
  value,
  onChange,
  placeholder = 'Enter value...',
  className = '',
  operator = '',
}) {
  const [inputValue, setInputValue] = useState(value ?? '');

  // Handle change and propagate
  const handleChange = (newValue) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  if (!property) {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={`property-value-input ${className}`}
        style={inputStyles}
      />
    );
  }

  const { type, options } = property;

  // Text input
  if (type === 'text') {
    return (
      <input
        type="text"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={`property-value-input property-value-input--text ${className}`}
        style={inputStyles}
      />
    );
  }

  // Number input
  if (type === 'number') {
    return (
      <input
        type="number"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value ? parseFloat(e.target.value) : '')}
        placeholder={placeholder}
        className={`property-value-input property-value-input--number ${className}`}
        style={inputStyles}
      />
    );
  }

  // Date input - with operator-specific variations
  if (type === 'date') {
    // For "X days ago/from now" operators, show simple number input
    if (DAYS_OPERATORS.includes(operator)) {
      return (
        <DaysInput
          value={value}
          onChange={onChange}
          className={className}
        />
      );
    }

    // For "is between" operator, show range input
    if (DATE_RANGE_OPERATORS.includes(operator)) {
      return (
        <DateRangeInput
          value={value}
          onChange={onChange}
          className={className}
        />
      );
    }

    // For other operators, show full date value input (exact/today/relative)
    return (
      <DateValueInput
        value={value}
        onChange={onChange}
        className={className}
      />
    );
  }

  // Boolean input (dropdown)
  if (type === 'boolean') {
    return (
      <select
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        className={`property-value-input property-value-input--boolean ${className}`}
        style={selectStyles}
      >
        <option value="">Select...</option>
        <option value="true">Yes / True</option>
        <option value="false">No / False</option>
      </select>
    );
  }

  // Enum input (dropdown with options)
  if (type === 'enum' && options) {
    return (
      <select
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        className={`property-value-input property-value-input--enum ${className}`}
        style={selectStyles}
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  // Fallback to text input
  return (
    <input
      type="text"
      value={inputValue}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      className={`property-value-input ${className}`}
      style={inputStyles}
    />
  );
}

// Multi-value input for operators like "is any of"
export function PropertyMultiValueInput({
  property,
  values = [],
  onChange,
  placeholder = 'Add value...',
  className = '',
}) {
  const [inputValue, setInputValue] = useState('');

  const addValue = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onChange([...values, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeValue = (valueToRemove) => {
    onChange(values.filter(v => v !== valueToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValue();
    }
  };

  // For enum types, show a multi-select
  if (property?.type === 'enum' && property.options) {
    return (
      <div className={`property-multi-value ${className}`} style={multiContainerStyles}>
        <div style={tagsContainerStyles}>
          {values.map((val) => {
            const opt = property.options.find(o => o.value === val);
            return (
              <span key={val} style={tagStyles}>
                {opt?.label || val}
                <button
                  type="button"
                  onClick={() => removeValue(val)}
                  style={tagRemoveStyles}
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
        <select
          value=""
          onChange={(e) => {
            if (e.target.value && !values.includes(e.target.value)) {
              onChange([...values, e.target.value]);
            }
          }}
          style={selectStyles}
        >
          <option value="">Add value...</option>
          {property.options
            .filter(opt => !values.includes(opt.value))
            .map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
        </select>
      </div>
    );
  }

  // For text/other types, show tag input
  return (
    <div className={`property-multi-value ${className}`} style={multiContainerStyles}>
      <div style={tagsContainerStyles}>
        {values.map((val) => (
          <span key={val} style={tagStyles}>
            {val}
            <button
              type="button"
              onClick={() => removeValue(val)}
              style={tagRemoveStyles}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type={property?.type === 'number' ? 'number' : 'text'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={inputStyles}
        />
        <button type="button" onClick={addValue} style={addButtonStyles}>
          Add
        </button>
      </div>
    </div>
  );
}

// Styles
const inputStyles = {
  width: '100%',
  padding: '8px 12px',
  backgroundColor: 'var(--bb-color-input-bg, #2a2a2a)',
  border: '1px solid var(--bb-color-border, #3a3a3a)',
  borderRadius: '6px',
  color: 'var(--bb-color-text, #ffffff)',
  fontSize: '14px',
};

const selectStyles = {
  ...inputStyles,
  cursor: 'pointer',
};

const multiContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const tagsContainerStyles = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const tagStyles = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  backgroundColor: 'var(--bb-color-primary, #3B82F6)',
  borderRadius: '4px',
  fontSize: '12px',
  color: '#ffffff',
};

const tagRemoveStyles = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: '0 2px',
  fontSize: '14px',
  lineHeight: 1,
};

const addButtonStyles = {
  padding: '8px 16px',
  backgroundColor: 'var(--bb-color-primary, #3B82F6)',
  border: 'none',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};
