/**
 * StepConfigPanel - Right panel for configuring workflow steps
 * Shows different configuration forms based on the selected step type
 */
import { X } from 'lucide-react';
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

  // Handle trigger config
  if (selectedStepId === 'trigger') {
    return (
      <ConfigPanelWrapper title="Trigger" onClose={clearSelection}>
        <TriggerConfig
          entryCondition={workflow.entryCondition}
          objectType={workflow.objectType}
          onChange={setEntryCondition}
        />
      </ConfigPanelWrapper>
    );
  }

  // Find the selected step
  const step = steps.find((s) => s.id === selectedStepId);
  if (!step) return null;

  // Handle update
  const handleUpdate = (updates) => {
    updateStep(step.id, updates);
  };

  // Render appropriate config component
  const renderConfig = () => {
    switch (step.stepType) {
      case STEP_TYPES.ACTION:
        return (
          <ActionConfig
            step={step}
            onChange={handleUpdate}
          />
        );

      case STEP_TYPES.WAIT:
        return (
          <WaitConfig
            step={step}
            onChange={handleUpdate}
          />
        );

      case STEP_TYPES.DETERMINATOR:
        return (
          <DeterminatorConfig
            step={step}
            onChange={handleUpdate}
          />
        );

      case STEP_TYPES.GATE:
        return (
          <GateConfig
            step={step}
            onChange={handleUpdate}
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
            Unknown step type: {step.stepType}
          </div>
        );
    }
  };

  return (
    <ConfigPanelWrapper
      title={step.name || 'Configure Step'}
      onClose={clearSelection}
    >
      {renderConfig()}
    </ConfigPanelWrapper>
  );
}

/**
 * ConfigPanelWrapper - Wrapper component for config panels
 */
function ConfigPanelWrapper({ title, onClose, children }) {
  return (
    <div className={cn(
      "w-80 h-full",
      "border-l border-[var(--bb-color-border-subtle)]",
      "bg-[var(--bb-color-bg-surface)]",
      "flex flex-col"
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--bb-color-border-subtle)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--bb-color-text-primary)]">
          {title}
        </h3>
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

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
