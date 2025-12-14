/**
 * InlineEditableCell - Reusable inline editing cell for data tables
 * 
 * Supports multiple editor types:
 * - text: Simple text input
 * - number: Numeric input
 * - enum: Dropdown select from predefined options
 * - status: Status dropdown with badge preview
 * - boolean: Checkbox/switch
 * - relationship: Searchable dropdown for related entities (owner, etc.)
 * 
 * Usage:
 * <InlineEditableCell
 *   row={pet}
 *   column={columnConfig}
 *   value={pet.status}
 *   onCommit={(newValue) => handleUpdate(pet.id, 'status', newValue)}
 *   disabled={isSaving}
 * />
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, ChevronDown, Loader2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import { cn } from '@/lib/cn';

/**
 * Text/Number Editor
 */
const TextEditor = ({ value, onChange, onCommit, onCancel, type = 'text', autoFocus = true }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCommit}
      className="w-full h-8 px-2 text-sm rounded border bg-[var(--bb-color-bg-body)] border-[var(--bb-color-accent)] text-[var(--bb-color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--bb-color-accent)]"
    />
  );
};

/**
 * Enum/Select Editor
 */
const EnumEditor = ({ value, options = [], onChange, onCommit, onCancel, autoFocus = true }) => {
  const handleChange = (opt) => {
    onChange(opt?.value ?? '');
    // Commit immediately on selection change
    setTimeout(() => onCommit(), 0);
  };

  return (
    <StyledSelect
      options={options}
      value={value ?? ''}
      onChange={handleChange}
      onBlur={onCommit}
      isClearable={false}
      isSearchable={false}
      autoFocus={autoFocus}
      menuPortalTarget={document.body}
    />
  );
};

/**
 * Status Editor - Special enum with badge preview
 */
const StatusEditor = ({ value, options = [], onChange, onCommit, onCancel }) => {
  return (
    <EnumEditor
      value={value}
      options={options}
      onChange={onChange}
      onCommit={onCommit}
      onCancel={onCancel}
    />
  );
};

/**
 * Relationship Editor - Searchable dropdown for related entities
 */
const RelationshipEditor = ({
  value,
  displayValue,
  options = [],
  onChange,
  onCommit,
  onCancel,
  isLoading = false,
  placeholder = 'Select...',
}) => {
  const handleChange = (opt) => {
    const newValue = opt?.value || null;
    onChange(newValue);
    setTimeout(() => onCommit(), 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-8 px-2 text-sm text-[var(--bb-color-text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <StyledSelect
      options={options}
      value={value ?? ''}
      onChange={handleChange}
      onBlur={onCommit}
      isClearable={true}
      isSearchable={true}
      placeholder={placeholder}
      autoFocus={true}
      menuPortalTarget={document.body}
    />
  );
};

/**
 * Main InlineEditableCell Component
 */
const InlineEditableCell = ({
  row,
  column,
  value,
  displayValue,
  onCommit,
  disabled = false,
  className,
  children,
  // For relationship lookups
  lookupOptions = [],
  lookupLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const cellRef = useRef(null);

  // Reset edit value when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const handleStartEdit = useCallback((e) => {
    if (disabled || !column.editable) return;
    e.stopPropagation();
    setEditValue(value);
    setIsEditing(true);
  }, [disabled, column.editable, value]);

  const handleCommit = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onCommit(editValue);
      setIsEditing(false);
    } catch (error) {
      // Revert on error
      setEditValue(value);
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onCommit]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
  }, [value]);

  // Click outside to cancel
  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (e) => {
      if (cellRef.current && !cellRef.current.contains(e.target)) {
        handleCommit();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isEditing, handleCommit]);

  // Render editor based on type
  const renderEditor = () => {
    const editorType = column.editorType || 'text';
    const options = column.editorOptions?.options || [];

    switch (editorType) {
      case 'number':
        return (
          <TextEditor
            value={editValue}
            onChange={setEditValue}
            onCommit={handleCommit}
            onCancel={handleCancel}
            type="number"
          />
        );

      case 'enum':
      case 'status':
        return (
          <StatusEditor
            value={editValue}
            options={options}
            onChange={setEditValue}
            onCommit={handleCommit}
            onCancel={handleCancel}
          />
        );

      case 'relationship':
        return (
          <RelationshipEditor
            value={editValue}
            displayValue={displayValue}
            options={lookupOptions}
            onChange={setEditValue}
            onCommit={handleCommit}
            onCancel={handleCancel}
            isLoading={lookupLoading}
            placeholder={column.editorOptions?.placeholder || 'Select...'}
          />
        );

      case 'text':
      default:
        return (
          <TextEditor
            value={editValue}
            onChange={setEditValue}
            onCommit={handleCommit}
            onCancel={handleCancel}
            type="text"
          />
        );
    }
  };

  // Not editable - render children as-is
  if (!column.editable) {
    return children;
  }

  // Editing mode
  if (isEditing) {
    return (
      <div ref={cellRef} className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
        {renderEditor()}
        {isSaving && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bb-color-bg-body)]/50">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--bb-color-accent)]" />
          </div>
        )}
      </div>
    );
  }

  // View mode - clickable to edit with pill-focused hover
  return (
    <button
      ref={cellRef}
      type="button"
      className={cn(
        'group inline-flex cursor-pointer rounded-full transition-all duration-150',
        'hover:ring-1 hover:ring-[var(--bb-color-accent)]/50 hover:shadow-sm',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bb-color-accent)]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      onClick={handleStartEdit}
      title={disabled ? 'Saving...' : 'Click to edit'}
    >
      <span className="transition-all duration-150 group-hover:brightness-110">
        {children}
      </span>
    </button>
  );
};

export default InlineEditableCell;

