/**
 * WorkflowSelect - Reusable workflow dropdown for workflow actions
 * Fetches active workflows from API and displays with object type
 */
import { cn } from '@/lib/cn';
import { useWorkflowsForDropdown } from '../../../hooks';
import { OBJECT_TYPE_CONFIG } from '../../../constants';

export default function WorkflowSelect({
  objectType,
  excludeId,
  value,
  onChange,
  isMulti = false,
  placeholder = 'Select workflow...',
  className = '',
}) {
  const { data: workflows, isLoading, error } = useWorkflowsForDropdown(objectType, excludeId);

  // Handle single value change
  const handleChange = (e) => {
    const selectedValue = e.target.value;
    if (isMulti) {
      // For multi-select, toggle the value
      const currentValues = value || [];
      const newValues = currentValues.includes(selectedValue)
        ? currentValues.filter((v) => v !== selectedValue)
        : [...currentValues, selectedValue];
      onChange(newValues);
    } else {
      onChange(selectedValue || null);
    }
  };

  // Handle removing a value from multi-select
  const handleRemove = (valueToRemove) => {
    if (isMulti) {
      onChange((value || []).filter((v) => v !== valueToRemove));
    }
  };

  // Get workflow label by ID
  const getWorkflowLabel = (workflowId) => {
    const workflow = (workflows || []).find((w) => w.id === workflowId);
    return workflow?.name || workflowId;
  };

  // Get object type label
  const getObjectTypeLabel = (objType) => {
    return OBJECT_TYPE_CONFIG[objType]?.label || objType;
  };

  if (error) {
    return (
      <div className="text-sm text-[var(--bb-color-status-negative)]">
        Failed to load workflows
      </div>
    );
  }

  // Multi-select UI
  if (isMulti) {
    return (
      <div className={cn('space-y-2', className)}>
        {/* Selected tags */}
        {(value || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(value || []).map((workflowId) => (
              <span
                key={workflowId}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded',
                  'bg-[var(--bb-color-accent)] text-white text-xs'
                )}
              >
                {getWorkflowLabel(workflowId)}
                <button
                  type="button"
                  onClick={() => handleRemove(workflowId)}
                  className="hover:text-white/80"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Dropdown */}
        <select
          value=""
          onChange={handleChange}
          disabled={isLoading}
          className={cn(
            'w-full px-3 py-2 rounded-md',
            'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
            'text-sm text-[var(--bb-color-text-primary)]',
            'focus:outline-none focus:border-[var(--bb-color-accent)]',
            'disabled:opacity-50'
          )}
        >
          <option value="">
            {isLoading ? 'Loading workflows...' : placeholder}
          </option>
          {(workflows || [])
            .filter((w) => !(value || []).includes(w.id))
            .map((workflow) => (
              <option key={workflow.id} value={workflow.id}>
                {workflow.name} ({getObjectTypeLabel(workflow.object_type)})
              </option>
            ))}
        </select>

        {!isLoading && (workflows || []).length === 0 && (
          <div className="text-xs text-[var(--bb-color-text-tertiary)]">
            {objectType
              ? `No active ${getObjectTypeLabel(objectType)} workflows found`
              : 'No active workflows found'}
          </div>
        )}
      </div>
    );
  }

  // Single-select UI
  return (
    <div className={className}>
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={isLoading}
        className={cn(
          'w-full px-3 py-2 rounded-md',
          'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
          'text-sm text-[var(--bb-color-text-primary)]',
          'focus:outline-none focus:border-[var(--bb-color-accent)]',
          'disabled:opacity-50'
        )}
      >
        <option value="">
          {isLoading ? 'Loading workflows...' : placeholder}
        </option>
        {(workflows || []).map((workflow) => (
          <option key={workflow.id} value={workflow.id}>
            {workflow.name} ({getObjectTypeLabel(workflow.object_type)})
          </option>
        ))}
      </select>

      {!isLoading && (workflows || []).length === 0 && (
        <div className="mt-1 text-xs text-[var(--bb-color-text-tertiary)]">
          {objectType
            ? `No active ${getObjectTypeLabel(objectType)} workflows found`
            : 'No active workflows found'}
        </div>
      )}
    </div>
  );
}
