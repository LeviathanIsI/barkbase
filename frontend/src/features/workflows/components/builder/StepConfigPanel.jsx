/**
 * StepConfigPanel - Right panel for configuring workflow steps
 * Shows different configuration forms based on the selected step type
 *
 * IMPORTANT: This panel uses local state for editing. Changes are only
 * committed to the store when the user clicks "Save". Clicking "Cancel"
 * or closing the panel discards unsaved changes.
 */
import { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import { useWorkflowBuilderStore } from '../../stores/builderStore';
import { STEP_TYPES } from '../../constants';

// Config components
import TriggerConfig from './config/TriggerConfig';
import ActionConfig from './config/ActionConfig';
import WaitConfig from './config/WaitConfig';
import DeterminatorConfig from './config/DeterminatorConfig';
import GateConfig from './config/GateConfig';

export default function StepConfigPanel() {
  const {
    selectedStepId,
    steps,
    workflow,
    clearSelection,
    updateStep,
    setEntryCondition,
  } = useWorkflowBuilderStore();

  // Local state for editing
  const [localStep, setLocalStep] = useState(null);
  const [localEntryCondition, setLocalEntryCondition] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Find the selected step from the store
  const storeStep = steps.find((s) => s.id === selectedStepId);

  // Initialize local state when selection changes
  useEffect(() => {
    if (selectedStepId === 'trigger') {
      setLocalEntryCondition(JSON.parse(JSON.stringify(workflow.entryCondition || {})));
      setLocalStep(null);
    } else if (storeStep) {
      setLocalStep(JSON.parse(JSON.stringify(storeStep)));
      setLocalEntryCondition(null);
    } else {
      setLocalStep(null);
      setLocalEntryCondition(null);
    }
    setHasChanges(false);
    setShowUnsavedWarning(false);
  }, [selectedStepId, storeStep?.id]); // Only reset when selection changes

  // Handle local step update
  const handleLocalUpdate = useCallback((updates) => {
    setLocalStep((prev) => {
      if (!prev) return prev;
      const updated = { ...prev };

      // Merge updates
      Object.keys(updates).forEach((key) => {
        if (key === 'config') {
          updated.config = { ...updated.config, ...updates.config };
        } else {
          updated[key] = updates[key];
        }
      });

      return updated;
    });
    setHasChanges(true);
  }, []);

  // Handle local entry condition update
  const handleLocalEntryConditionUpdate = useCallback((updates) => {
    setLocalEntryCondition((prev) => ({
      ...prev,
      ...updates,
    }));
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (selectedStepId === 'trigger' && localEntryCondition) {
      setEntryCondition(localEntryCondition);
    } else if (localStep) {
      updateStep(localStep.id, localStep);
    }
    setHasChanges(false);
  }, [selectedStepId, localStep, localEntryCondition, updateStep, setEntryCondition]);

  // Handle cancel / close
  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedWarning(true);
    } else {
      clearSelection();
    }
  }, [hasChanges, clearSelection]);

  // Handle discard changes
  const handleDiscard = useCallback(() => {
    setShowUnsavedWarning(false);
    clearSelection();
  }, [clearSelection]);

  // Handle cancel discard (stay on panel)
  const handleCancelDiscard = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  // Handle trigger config
  if (selectedStepId === 'trigger') {
    if (!localEntryCondition) return null;

    return (
      <ConfigPanelWrapper
        title="Trigger"
        onClose={handleClose}
        hasChanges={hasChanges}
        onSave={handleSave}
        onCancel={handleClose}
        showUnsavedWarning={showUnsavedWarning}
        onDiscard={handleDiscard}
        onCancelDiscard={handleCancelDiscard}
      >
        <TriggerConfig
          entryCondition={localEntryCondition}
          objectType={workflow.objectType}
          onChange={handleLocalEntryConditionUpdate}
        />
      </ConfigPanelWrapper>
    );
  }

  // No step selected or step not found
  if (!localStep) return null;

  // Render appropriate config component
  const renderConfig = () => {
    switch (localStep.stepType) {
      case STEP_TYPES.ACTION:
        return (
          <ActionConfig
            step={localStep}
            objectType={workflow.objectType}
            onChange={handleLocalUpdate}
          />
        );

      case STEP_TYPES.WAIT:
        return (
          <WaitConfig
            step={localStep}
            objectType={workflow.objectType}
            onChange={handleLocalUpdate}
          />
        );

      case STEP_TYPES.DETERMINATOR:
        return (
          <DeterminatorConfig
            step={localStep}
            objectType={workflow.objectType}
            onChange={handleLocalUpdate}
          />
        );

      case STEP_TYPES.GATE:
        return (
          <GateConfig
            step={localStep}
            objectType={workflow.objectType}
            onChange={handleLocalUpdate}
          />
        );

      case STEP_TYPES.TERMINUS:
        return (
          <div className="p-4 text-sm text-[var(--bb-color-text-tertiary)]">
            This step marks the end of this workflow path.
            No configuration needed.
          </div>
        );

      default:
        return (
          <div className="p-4 text-sm text-[var(--bb-color-text-tertiary)]">
            Unknown step type: {localStep.stepType}
          </div>
        );
    }
  };

  return (
    <ConfigPanelWrapper
      title={localStep.name || 'Configure Step'}
      onClose={handleClose}
      hasChanges={hasChanges}
      onSave={handleSave}
      onCancel={handleClose}
      showUnsavedWarning={showUnsavedWarning}
      onDiscard={handleDiscard}
      onCancelDiscard={handleCancelDiscard}
    >
      {renderConfig()}
    </ConfigPanelWrapper>
  );
}

/**
 * ConfigPanelWrapper - Wrapper component for config panels
 * Includes header, content area, and Save/Cancel buttons
 */
function ConfigPanelWrapper({
  title,
  onClose,
  hasChanges,
  onSave,
  onCancel,
  showUnsavedWarning,
  onDiscard,
  onCancelDiscard,
  children,
}) {
  return (
    <div className={cn(
      "w-80 h-full relative",
      "border-l border-[var(--bb-color-border-subtle)]",
      "bg-[var(--bb-color-bg-surface)]",
      "flex flex-col"
    )}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
            {title}
          </h3>
          {hasChanges && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-[rgba(59,130,246,0.2)] text-[#3B82F6]">
              Unsaved
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className={cn(
            "p-1 rounded",
            "text-[var(--bb-color-text-tertiary)]",
            "hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]"
          )}
        >
          <X size={18} />
        </button>
      </div>

      {/* Save/Cancel buttons - RIGHT BELOW HEADER */}
      <div className={cn(
        "flex-shrink-0 px-4 py-3",
        "border-b border-[var(--bb-color-border-subtle)]",
        "bg-[var(--bb-color-bg-surface)]",
        "flex items-center justify-end gap-3"
      )}>
        <button
          onClick={onCancel}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium",
            "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)]",
            "border border-[var(--bb-color-border-subtle)]",
            "hover:bg-[var(--bb-color-bg-body)] hover:border-[var(--bb-color-border-strong)]",
            "transition-colors"
          )}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!hasChanges}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium",
            "transition-colors",
            hasChanges
              ? "bg-[#3B82F6] text-white hover:bg-[#2563EB]"
              : "bg-[#3B82F6]/50 text-white/70 cursor-not-allowed"
          )}
        >
          Save
        </button>
      </div>

      {/* Content - scrollable area */}
      <div className="flex-1 overflow-auto min-h-0">
        {children}
      </div>

      {/* Unsaved changes warning modal */}
      {showUnsavedWarning && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={cn(
            "bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]",
            "rounded-lg p-4 m-4 shadow-xl max-w-xs"
          )}>
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-[var(--bb-color-text-primary)] mb-1">
                  Unsaved changes
                </h4>
                <p className="text-xs text-[var(--bb-color-text-secondary)]">
                  You have unsaved changes. Do you want to discard them?
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancelDiscard}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium",
                  "bg-[var(--bb-color-bg-elevated)] text-[var(--bb-color-text-primary)]",
                  "border border-[var(--bb-color-border-subtle)]",
                  "hover:bg-[var(--bb-color-bg-body)]"
                )}
              >
                Keep editing
              </button>
              <button
                onClick={onDiscard}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium",
                  "bg-[#EF4444] text-white",
                  "hover:bg-[#DC2626]"
                )}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
