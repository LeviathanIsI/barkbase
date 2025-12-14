/**
 * BuilderCanvas - Main canvas component for the workflow builder
 * Renders the visual workflow with trigger, steps, and connectors
 */
import { cn } from '@/lib/cn';
import { useWorkflowBuilderStore } from '../../stores/builderStore';
import { STEP_TYPES } from '../../constants';

import TriggerCard from './canvas/TriggerCard';
import StepCard from './canvas/StepCard';
import Connector from './canvas/Connector';
import AddStepButton from './canvas/AddStepButton';

export default function BuilderCanvas() {
  const {
    workflow,
    steps,
    selectedStepId,
    selectStep,
    addStep,
    deleteStep,
  } = useWorkflowBuilderStore();

  // Get root level steps (not in branches)
  const rootSteps = steps
    .filter((s) => !s.parentStepId)
    .sort((a, b) => a.position - b.position);

  // Handle adding a step
  const handleAddStep = (stepType, actionType, afterStepId, branchPath) => {
    addStep(stepType, actionType, afterStepId, branchPath);
  };

  return (
    <div
      className={cn(
        "min-h-full w-full p-8",
        "flex flex-col items-center",
        "bg-[var(--bb-color-bg-body)]"
      )}
      style={{
        backgroundImage: `radial-gradient(circle, var(--bb-color-border-subtle) 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }}
    >
      {/* Trigger Card */}
      <TriggerCard
        entryCondition={workflow.entryCondition}
        isSelected={selectedStepId === 'trigger'}
        onClick={() => selectStep('trigger')}
      />

      {/* First connector with add button */}
      <div className="relative flex flex-col items-center">
        <Connector height={40} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <AddStepButton
            onAddStep={handleAddStep}
            afterStepId={null}
            branchPath={null}
          />
        </div>
      </div>

      {/* Steps */}
      {rootSteps.map((step, index) => (
        <StepNode
          key={step.id}
          step={step}
          allSteps={steps}
          isSelected={selectedStepId === step.id}
          onSelect={() => selectStep(step.id)}
          onDelete={() => deleteStep(step.id)}
          onAddStep={handleAddStep}
          isLast={index === rootSteps.length - 1}
        />
      ))}

      {/* End node if no steps or no terminus */}
      {rootSteps.length === 0 && (
        <EndNode />
      )}
    </div>
  );
}

/**
 * StepNode - Renders a single step with its connectors
 */
function StepNode({
  step,
  allSteps,
  isSelected,
  onSelect,
  onDelete,
  onAddStep,
  isLast,
}) {
  // If this is a determinator, render with branches
  if (step.stepType === STEP_TYPES.DETERMINATOR) {
    return (
      <DeterminatorNode
        step={step}
        allSteps={allSteps}
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onAddStep={onAddStep}
      />
    );
  }

  // Regular step
  return (
    <>
      <StepCard
        step={step}
        isSelected={isSelected}
        onClick={onSelect}
        onDelete={onDelete}
      />

      {/* Connector after step (unless it's terminus) */}
      {step.stepType !== STEP_TYPES.TERMINUS && (
        <div className="relative flex flex-col items-center">
          <Connector height={40} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <AddStepButton
              onAddStep={onAddStep}
              afterStepId={step.id}
              branchPath={null}
            />
          </div>
        </div>
      )}

      {/* End node after last non-terminus step */}
      {isLast && step.stepType !== STEP_TYPES.TERMINUS && (
        <EndNode />
      )}
    </>
  );
}

/**
 * DeterminatorNode - Renders a determinator step with Yes/No branches
 */
function DeterminatorNode({
  step,
  allSteps,
  isSelected,
  onSelect,
  onDelete,
  onAddStep,
}) {
  // Get steps for each branch
  const yesSteps = allSteps
    .filter((s) => s.parentStepId === step.id && s.branchPath === 'yes')
    .sort((a, b) => a.position - b.position);

  const noSteps = allSteps
    .filter((s) => s.parentStepId === step.id && s.branchPath === 'no')
    .sort((a, b) => a.position - b.position);

  return (
    <>
      {/* Determinator card */}
      <StepCard
        step={step}
        isSelected={isSelected}
        onClick={onSelect}
        onDelete={onDelete}
      />

      {/* Branch split */}
      <div className="flex items-start">
        {/* Yes branch */}
        <div className="flex flex-col items-center mx-8">
          {/* Branch connector */}
          <svg width="100" height="40" className="overflow-visible">
            <path
              d="M 50 0 L 50 20 L 0 20 L 0 40"
              fill="none"
              stroke="var(--bb-color-border-subtle)"
              strokeWidth="2"
            />
          </svg>

          {/* Branch label */}
          <div className="px-2 py-0.5 -mt-1 mb-2 rounded text-xs font-medium bg-[rgba(16,185,129,0.2)] text-[#10B981]">
            Yes
          </div>

          {/* Add step button for yes branch */}
          <AddStepButton
            onAddStep={onAddStep}
            afterStepId={step.id}
            branchPath="yes"
            size="small"
          />

          {/* Yes branch steps */}
          {yesSteps.map((branchStep) => (
            <BranchStepNode
              key={branchStep.id}
              step={branchStep}
              onAddStep={onAddStep}
            />
          ))}

          {/* End node for yes branch */}
          <Connector height={20} />
          <EndNode small />
        </div>

        {/* No branch */}
        <div className="flex flex-col items-center mx-8">
          {/* Branch connector */}
          <svg width="100" height="40" className="overflow-visible">
            <path
              d="M 50 0 L 50 20 L 100 20 L 100 40"
              fill="none"
              stroke="var(--bb-color-border-subtle)"
              strokeWidth="2"
            />
          </svg>

          {/* Branch label */}
          <div className="px-2 py-0.5 -mt-1 mb-2 rounded text-xs font-medium bg-[rgba(239,68,68,0.2)] text-[#EF4444]">
            No
          </div>

          {/* Add step button for no branch */}
          <AddStepButton
            onAddStep={onAddStep}
            afterStepId={step.id}
            branchPath="no"
            size="small"
          />

          {/* No branch steps */}
          {noSteps.map((branchStep) => (
            <BranchStepNode
              key={branchStep.id}
              step={branchStep}
              onAddStep={onAddStep}
            />
          ))}

          {/* End node for no branch */}
          <Connector height={20} />
          <EndNode small />
        </div>
      </div>
    </>
  );
}

/**
 * BranchStepNode - Step node inside a branch
 */
function BranchStepNode({
  step,
  onAddStep,
}) {
  const { selectedStepId, selectStep, deleteStep } = useWorkflowBuilderStore();

  return (
    <>
      <Connector height={20} />
      <StepCard
        step={step}
        isSelected={selectedStepId === step.id}
        onClick={() => selectStep(step.id)}
        onDelete={() => deleteStep(step.id)}
      />
      <Connector height={20} />
      <AddStepButton
        onAddStep={onAddStep}
        afterStepId={step.id}
        branchPath={branchPath}
        size="small"
      />
    </>
  );
}

/**
 * EndNode - End of workflow marker
 */
function EndNode({ small = false }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--bb-color-border-subtle)]",
        "bg-[var(--bb-color-bg-elevated)]",
        "flex items-center justify-center",
        "text-[var(--bb-color-text-tertiary)]",
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm"
      )}
    >
      End
    </div>
  );
}
