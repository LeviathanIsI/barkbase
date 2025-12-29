/**
 * EditableProperty - Inline editable property component
 * Click to edit, save on blur/Enter, with loading and error states
 */

import { useState, useRef, useEffect, createContext, useContext } from 'react';
import { Check, X, Loader2, Pencil } from 'lucide-react';
import Select from 'react-select';
import { cn } from '@/lib/utils';
import { useTimezoneUtils } from '@/lib/timezone';
import Button from './Button';

// Context to coordinate single active edit across all property lists on a page
const EditablePropertyContext = createContext(null);

/**
 * Provider to ensure only one property is being edited at a time across all lists
 * Wrap your page/section with this to coordinate edits
 */
export function EditablePropertyProvider({ children }) {
  const [activeEditKey, setActiveEditKey] = useState(null);

  return (
    <EditablePropertyContext.Provider value={{ activeEditKey, setActiveEditKey }}>
      {children}
    </EditablePropertyContext.Provider>
  );
}

// Hook to access the shared edit context
const useEditablePropertyContext = () => useContext(EditablePropertyContext);

// Styled select for dark theme
const selectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    borderColor: state.isFocused ? 'var(--bb-color-accent)' : 'var(--bb-color-border-subtle)',
    borderRadius: '0.375rem',
    minHeight: '32px',
    boxShadow: state.isFocused ? '0 0 0 1px var(--bb-color-accent)' : 'none',
    '&:hover': { borderColor: 'var(--bb-color-border-subtle)' },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--bb-color-bg-surface)',
    border: '1px solid var(--bb-color-border-subtle)',
    borderRadius: '0.375rem',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 99999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? 'var(--bb-color-accent)' : state.isFocused ? 'var(--bb-color-bg-muted)' : 'transparent',
    color: state.isSelected ? 'white' : 'var(--bb-color-text-primary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '6px 12px',
  }),
  singleValue: (base) => ({ ...base, color: 'var(--bb-color-text-primary)', fontSize: '0.875rem' }),
  input: (base) => ({ ...base, color: 'var(--bb-color-text-primary)', fontSize: '0.875rem' }),
  placeholder: (base) => ({ ...base, color: 'var(--bb-color-text-muted)', fontSize: '0.875rem' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({ ...base, color: 'var(--bb-color-text-muted)', padding: '4px' }),
};

// Format date for display (handles invalid dates)
const formatDateDisplay = (value, tzFormatDate) => {
  if (!value || value === 'Invalid Date') return '—';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '—';
    return tzFormatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

// Format date for input (YYYY-MM-DD)
const formatDateInput = (value) => {
  if (!value || value === 'Invalid Date') return '';
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

// Format boolean for display
const formatBooleanDisplay = (value) => {
  if (value === true || value === 'true' || value === 'Yes') return 'Yes';
  if (value === false || value === 'false' || value === 'No') return 'No';
  return '—';
};

// Format phone for display
const formatPhoneDisplay = (value) => {
  if (!value) return '—';
  // Basic US phone formatting
  const cleaned = String(value).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return value;
};

// Format currency for display
const formatCurrencyDisplay = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return `$${num.toFixed(2)}`;
};

/**
 * EditableProperty Component
 *
 * @param {Object} property - Property config { name, label, type, value, options?, required? }
 * @param {Function} onSave - Async function to save new value
 * @param {string} fieldKey - The API field key to update
 * @param {boolean} disabled - Disable editing
 */
export function EditableProperty({
  property,
  onSave,
  fieldKey,
  disabled = false,
  // Controlled mode props (optional - used by EditablePropertyList)
  isEditingControlled,
  onStartEdit,
  onStopEdit,
}) {
  const tz = useTimezoneUtils();
  const { label, type = 'text', value, options = [], required = false, suffix = '' } = property;

  // Use controlled mode if onStartEdit is provided, otherwise internal state
  const isControlled = typeof onStartEdit === 'function';
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = isControlled ? isEditingControlled : internalEditing;

  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Reset edit value when prop changes
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Select text for text inputs
      if (inputRef.current.select && type !== 'date' && type !== 'datetime') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const setEditing = (editing) => {
    if (isControlled) {
      if (editing) onStartEdit?.(fieldKey);
      else onStopEdit?.();
    } else {
      setInternalEditing(editing);
    }
  };

  const handleStartEdit = () => {
    if (disabled || saving) return;
    setEditing(true);
    setError(null);
    // For dates, convert to input format
    if (type === 'date' || type === 'datetime') {
      setEditValue(formatDateInput(value));
    } else {
      setEditValue(value ?? '');
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    if (saving) return;

    // Validate required
    if (required && !editValue && editValue !== false && editValue !== 0) {
      setError('This field is required');
      return;
    }

    // Don't save if unchanged
    const normalizedEdit = editValue === '' ? null : editValue;
    const normalizedValue = value === '' ? null : value;
    if (normalizedEdit === normalizedValue) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(fieldKey, normalizedEdit);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleBlur = (e) => {
    // Don't blur if clicking within the component
    if (e.relatedTarget?.closest('[data-editable-property]')) return;
    handleSave();
  };

  // Get display value
  const getDisplayValue = () => {
    if (value === null || value === undefined || value === '' || value === 'Invalid Date') {
      return '—';
    }

    switch (type) {
      case 'date':
      case 'datetime':
        return formatDateDisplay(value, tz.formatDate);
      case 'boolean':
        return formatBooleanDisplay(value);
      case 'phone':
        return formatPhoneDisplay(value);
      case 'currency':
        return formatCurrencyDisplay(value);
      case 'single-select':
        // Find label from options if exists
        const opt = options.find(o => (typeof o === 'object' ? o.value : o) === value);
        return opt ? (typeof opt === 'object' ? opt.label : opt) : value;
      default:
        return String(value) + suffix;
    }
  };

  // Render the appropriate input control
  const renderInput = () => {
    const baseInputClass = cn(
      'w-full px-2 py-1 text-sm rounded border transition-colors',
      'bg-[color:var(--bb-color-bg-surface)] text-[color:var(--bb-color-text-primary)]',
      'border-[color:var(--bb-color-border-subtle)]',
      'focus:outline-none focus:ring-1 focus:ring-[color:var(--bb-color-accent)] focus:border-[color:var(--bb-color-accent)]',
      error && 'border-red-500 focus:ring-red-500'
    );

    switch (type) {
      case 'textarea':
        return (
          <textarea
            ref={inputRef}
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={cn(baseInputClass, 'min-h-[60px] resize-y')}
            disabled={saving}
            data-editable-property
          />
        );

      case 'number':
      case 'currency':
        return (
          <input
            ref={inputRef}
            type="number"
            step={type === 'currency' ? '0.01' : 'any'}
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={baseInputClass}
            disabled={saving}
            data-editable-property
          />
        );

      case 'date':
        return (
          <input
            ref={inputRef}
            type="date"
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={baseInputClass}
            disabled={saving}
            data-editable-property
          />
        );

      case 'datetime':
        return (
          <input
            ref={inputRef}
            type="datetime-local"
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={baseInputClass}
            disabled={saving}
            data-editable-property
          />
        );

      case 'boolean':
        return (
          <div className="flex gap-2" data-editable-property>
            <Button
              variant={editValue === true ? 'primary' : 'outline'}
              size="xs"
              onClick={() => { setEditValue(true); }}
              disabled={saving}
            >
              Yes
            </Button>
            <Button
              variant={editValue === false ? 'primary' : 'outline'}
              size="xs"
              onClick={() => { setEditValue(false); }}
              disabled={saving}
            >
              No
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleSave}
              disabled={saving}
              className="text-green-500 hover:text-green-400"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleCancel}
              disabled={saving}
              className="text-red-500 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        );

      case 'single-select':
        const selectOptions = options.map(opt =>
          typeof opt === 'object' ? opt : { value: opt, label: opt }
        );
        return (
          <div data-editable-property>
            <Select
              value={selectOptions.find(o => o.value === editValue) || null}
              onChange={(opt) => {
                setEditValue(opt?.value ?? null);
                // Auto-save on select
                setTimeout(async () => {
                  setSaving(true);
                  try {
                    await onSave(fieldKey, opt?.value ?? null);
                    setEditing(false);
                  } catch (err) {
                    setError(err.message || 'Failed to save');
                  } finally {
                    setSaving(false);
                  }
                }, 0);
              }}
              options={selectOptions}
              styles={selectStyles}
              menuPortalTarget={document.body}
              isDisabled={saving}
              isClearable
              autoFocus
            />
          </div>
        );

      case 'email':
        return (
          <input
            ref={inputRef}
            type="email"
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={baseInputClass}
            disabled={saving}
            data-editable-property
          />
        );

      case 'phone':
        return (
          <input
            ref={inputRef}
            type="tel"
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={baseInputClass}
            disabled={saving}
            data-editable-property
          />
        );

      case 'url':
        return (
          <input
            ref={inputRef}
            type="url"
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={baseInputClass}
            placeholder="https://"
            disabled={saving}
            data-editable-property
          />
        );

      default: // text, single-line
        return (
          <input
            ref={inputRef}
            type="text"
            value={editValue ?? ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className={baseInputClass}
            disabled={saving}
            data-editable-property
          />
        );
    }
  };

  return (
    <div className="group" data-editable-property>
      {/* Label */}
      <dt
        className="text-xs font-medium uppercase tracking-wide mb-1"
        style={{ color: 'var(--bb-color-text-muted)' }}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </dt>

      {/* Value / Input */}
      <dd>
        {isEditing ? (
          <div className="relative">
            {renderInput()}
            {saving && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-[color:var(--bb-color-text-muted)]" />
              </div>
            )}
            {error && (
              <p className="text-xs text-red-500 mt-1">{error}</p>
            )}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            disabled={disabled}
            className={cn(
              'w-full justify-between text-left font-normal px-1 -mx-1 py-0.5 h-auto',
              disabled && 'cursor-default hover:bg-transparent'
            )}
          >
            <span className={getDisplayValue() === '—' ? 'text-[color:var(--bb-color-text-muted)]' : ''}>
              {getDisplayValue()}
            </span>
            {!disabled && (
              <Pencil
                className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0"
                style={{ color: 'var(--bb-color-text-muted)' }}
              />
            )}
          </Button>
        )}
      </dd>
    </div>
  );
}

/**
 * EditablePropertyList - Renders a list of editable properties
 * Only one property can be edited at a time (across all lists when using EditablePropertyProvider)
 */
export function EditablePropertyList({
  properties,
  onSave,
  disabled = false,
  className,
}) {
  // Use shared context if available, otherwise local state
  const context = useEditablePropertyContext();
  const [localActiveKey, setLocalActiveKey] = useState(null);

  const activeEditKey = context ? context.activeEditKey : localActiveKey;
  const setActiveEditKey = context ? context.setActiveEditKey : setLocalActiveKey;

  const handleStartEdit = (fieldKey) => {
    setActiveEditKey(fieldKey);
  };

  const handleStopEdit = () => {
    setActiveEditKey(null);
  };

  return (
    <dl className={cn('space-y-4', className)}>
      {properties.map((prop) => (
        <EditableProperty
          key={prop.fieldKey || prop.label}
          property={prop}
          fieldKey={prop.fieldKey}
          onSave={onSave}
          disabled={disabled || (prop.fieldKey === null)}
          isEditingControlled={activeEditKey === prop.fieldKey}
          onStartEdit={handleStartEdit}
          onStopEdit={handleStopEdit}
        />
      ))}
    </dl>
  );
}

export default EditableProperty;
