/**
 * AddStepButton - Button to add a new step in the workflow canvas
 * Shows a dropdown with available action types
 */
import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACTION_CATEGORIES } from '../../../constants';

export default function AddStepButton({
  onAddStep,
  afterStepId,
  branchPath,
  size = 'default',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleActionSelect = (action) => {
    const stepType = action.stepType || 'action';
    const actionType = action.stepType ? null : action.type;
    onAddStep?.(stepType, actionType, afterStepId, branchPath);
    setIsOpen(false);
  };

  const buttonSize = size === 'small' ? 'w-5 h-5' : 'w-6 h-6';
  const iconSize = size === 'small' ? 10 : 12;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          buttonSize,
          "rounded-full",
          "bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]",
          "flex items-center justify-center",
          "text-[var(--bb-color-text-tertiary)]",
          "hover:border-[var(--bb-color-accent)] hover:text-[var(--bb-color-accent)]",
          "hover:bg-[var(--bb-color-accent-soft)]",
          "transition-all duration-150",
          isOpen && "border-[var(--bb-color-accent)] text-[var(--bb-color-accent)] bg-[var(--bb-color-accent-soft)]"
        )}
      >
        <Plus size={iconSize} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 mt-2 w-64 z-50",
          "bg-[var(--bb-color-bg-elevated)] rounded-lg",
          "border border-[var(--bb-color-border-subtle)]",
          "shadow-xl"
        )}>
          <div className="p-2 border-b border-[var(--bb-color-border-subtle)]">
            <div className="text-xs font-medium text-[var(--bb-color-text-secondary)] px-2">
              Add an action
            </div>
          </div>

          <div className="max-h-80 overflow-auto py-1">
            {Object.entries(ACTION_CATEGORIES).map(([key, category]) => (
              <div key={key} className="py-1">
                <div className="px-3 py-1 text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                  {category.label}
                </div>
                {category.actions.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => handleActionSelect(action)}
                    className={cn(
                      "w-full px-3 py-2 flex items-start gap-2 text-left",
                      "hover:bg-[var(--bb-color-bg-surface)]",
                      "transition-colors"
                    )}
                  >
                    <div className="flex-1">
                      <div className="text-sm text-[var(--bb-color-text-primary)]">
                        {action.label}
                      </div>
                      <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                        {action.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
