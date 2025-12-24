/**
 * BuilderCanvas - Main canvas component for the workflow builder
 * Renders the visual workflow with trigger, steps, and connectors
 * Supports pan and zoom functionality
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useWorkflowBuilderStore } from '../../stores/builderStore';
import { STEP_TYPES } from '../../constants';

import TriggerCard from './canvas/TriggerCard';
import StepCard from './canvas/StepCard';
import Connector from './canvas/Connector';
import AddStepButton from './canvas/AddStepButton';

// Zoom constants
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;
const ZOOM_STEP = 0.1;

export default function BuilderCanvas() {
  const {
    workflow,
    steps,
    selectedStepId,
    selectStep,
    deleteStep,
    openTriggerConfig,
  } = useWorkflowBuilderStore();

  // Pan and zoom state
  const canvasRef = useRef(null);
  const contentRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Get root level steps (not in branches)
  const rootSteps = steps
    .filter((s) => !s.parentStepId)
    .sort((a, b) => a.position - b.position);

  // Zoom controls
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale + ZOOM_STEP),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale - ZOOM_STEP),
    }));
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // Mouse wheel zoom (Ctrl/Cmd + scroll)
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setTransform((prev) => ({
        ...prev,
        scale: Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale + delta)),
      }));
    }
  }, []);

  // Pan with mouse drag (middle mouse or click on background)
  const handleMouseDown = (e) => {
    // Check if clicking on canvas background (not on a step or button)
    const isBackground = e.target === canvasRef.current || e.target === contentRef.current;
    if (e.button === 1 || (e.button === 0 && isBackground)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (isPanning) {
        setTransform((prev) => ({
          ...prev,
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        }));
      }
    },
    [isPanning, panStart]
  );

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Add wheel listener with passive: false for preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  return (
    <div className="relative flex-1 overflow-hidden bg-[var(--bb-color-bg-body)]">
      {/* Zoom Controls */}
      <div
        className={cn(
          'absolute top-4 right-4 z-20',
          'flex items-center gap-1',
          'bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]',
          'rounded-lg p-1 shadow-lg'
        )}
      >
        <button
          onClick={handleZoomOut}
          disabled={transform.scale <= MIN_SCALE}
          className={cn(
            'p-2 rounded',
            'text-[var(--bb-color-text-secondary)]',
            'hover:bg-[var(--bb-color-bg-surface)] hover:text-[var(--bb-color-text-primary)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          title="Zoom out (Ctrl + Scroll)"
        >
          <ZoomOut size={16} />
        </button>
        <span className="px-2 text-sm text-[var(--bb-color-text-tertiary)] min-w-[50px] text-center">
          {Math.round(transform.scale * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          disabled={transform.scale >= MAX_SCALE}
          className={cn(
            'p-2 rounded',
            'text-[var(--bb-color-text-secondary)]',
            'hover:bg-[var(--bb-color-bg-surface)] hover:text-[var(--bb-color-text-primary)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors'
          )}
          title="Zoom in (Ctrl + Scroll)"
        >
          <ZoomIn size={16} />
        </button>
        <div className="w-px h-6 bg-[var(--bb-color-border-subtle)] mx-1" />
        <button
          onClick={handleResetView}
          className={cn(
            'p-2 rounded',
            'text-[var(--bb-color-text-secondary)]',
            'hover:bg-[var(--bb-color-bg-surface)] hover:text-[var(--bb-color-text-primary)]',
            'transition-colors'
          )}
          title="Reset view"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        className={cn(
          'w-full h-full overflow-hidden',
          isPanning ? 'cursor-grabbing' : 'cursor-default'
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Transformable content */}
        <div
          ref={contentRef}
          className="min-h-full flex flex-col items-center py-8"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center top',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
            backgroundImage: `radial-gradient(circle, var(--bb-color-border-subtle) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        >
          {/* Trigger Card */}
          <TriggerCard
            entryCondition={workflow.entryCondition}
            objectType={workflow.objectType}
            settings={workflow.settings}
            isSelected={selectedStepId === 'trigger'}
            onClick={() => selectStep('trigger')}
            onSettingsClick={() => openTriggerConfig('settings')}
          />

          {/* First connector with add button */}
          <div className="relative flex flex-col items-center">
            <Connector height={40} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <AddStepButton afterStepId={null} branchId={null} />
            </div>
          </div>

          {/* Steps */}
          {rootSteps.map((step, index) => (
            <StepNode
              key={step.id}
              step={step}
              allSteps={steps}
              objectType={workflow.objectType}
              isSelected={selectedStepId === step.id}
              onSelect={() => selectStep(step.id)}
              onDelete={() => deleteStep(step.id)}
              isLast={index === rootSteps.length - 1}
            />
          ))}

          {/* End node if no steps or no terminus */}
          {rootSteps.length === 0 && <EndNode />}
        </div>
      </div>
    </div>
  );
}

/**
 * StepNode - Renders a single step with its connectors
 */
function StepNode({
  step,
  allSteps,
  objectType,
  isSelected,
  onSelect,
  onDelete,
  isLast,
}) {
  // If this is a determinator, render with branches
  if (step.stepType === STEP_TYPES.DETERMINATOR) {
    return (
      <DeterminatorNode
        step={step}
        allSteps={allSteps}
        objectType={objectType}
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
      />
    );
  }

  // Regular step
  return (
    <>
      <StepCard
        step={step}
        objectType={objectType}
        isSelected={isSelected}
        onClick={onSelect}
        onDelete={onDelete}
      />

      {/* Connector after step (unless it's terminus) */}
      {step.stepType !== STEP_TYPES.TERMINUS && (
        <div className="relative flex flex-col items-center">
          <Connector height={40} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <AddStepButton afterStepId={step.id} branchId={null} />
          </div>
        </div>
      )}

      {/* End node after last non-terminus step */}
      {isLast && step.stepType !== STEP_TYPES.TERMINUS && <EndNode />}
    </>
  );
}

/**
 * DeterminatorNode - Renders a determinator step with multiple dynamic branches
 * Supports any number of conditional branches plus a "None matched" default branch
 */
function DeterminatorNode({
  step,
  allSteps,
  objectType,
  isSelected,
  onSelect,
  onDelete,
}) {
  // Get branches from step config or use legacy yes/no structure
  const config = step.config || {};
  let branches = config.branches;

  // Handle legacy yes/no branch format (backwards compatibility)
  if (!branches) {
    branches = [
      { id: 'yes', name: 'Yes', order: 0 },
      { id: 'no', name: 'No', order: 1, isDefault: true },
    ];
  }

  // Sort branches by order, keeping default at end
  const sortedBranches = [...branches].sort((a, b) => {
    if (a.isDefault) return 1;
    if (b.isDefault) return -1;
    return a.order - b.order;
  });

  // Get branch colors - cycle through colors array
  const branchColors = [
    '#10B981', // Green
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
  ];

  // Calculate SVG connector paths for multiple branches
  const branchCount = sortedBranches.length;
  const branchSpacing = 180; // Space between branch centers
  const containerWidth = branchCount * branchSpacing;

  // Calculate positions for connector SVG
  const connectorHeight = 50;
  const horizontalY = 20;
  // Center of the SVG is at containerWidth/2
  const svgCenter = containerWidth / 2;

  return (
    <>
      {/* Determinator card */}
      <StepCard
        step={step}
        objectType={objectType}
        isSelected={isSelected}
        onClick={onSelect}
        onDelete={onDelete}
        branchCount={branchCount}
      />

      {/* Centered SVG connector: vertical line from card center, horizontal bar, branch drops */}
      <svg
        width={containerWidth}
        height={connectorHeight}
        className="overflow-visible"
      >
        {/* Main vertical line from Determinator center (center of SVG) */}
        <line
          x1={svgCenter}
          y1={0}
          x2={svgCenter}
          y2={horizontalY}
          stroke="var(--bb-color-border-subtle)"
          strokeWidth="2"
        />
        {/* Horizontal bar connecting all branches */}
        <line
          x1={branchSpacing / 2}
          y1={horizontalY}
          x2={containerWidth - branchSpacing / 2}
          y2={horizontalY}
          stroke="var(--bb-color-border-subtle)"
          strokeWidth="2"
        />
        {/* Vertical drops to each branch center */}
        {sortedBranches.map((_, index) => (
          <line
            key={index}
            x1={index * branchSpacing + branchSpacing / 2}
            y1={horizontalY}
            x2={index * branchSpacing + branchSpacing / 2}
            y2={connectorHeight}
            stroke="var(--bb-color-border-subtle)"
            strokeWidth="2"
          />
        ))}
      </svg>

      {/* Branch containers - centered by flex, no margin needed */}
      <div
        className="flex items-start"
      >
        {sortedBranches.map((branch, index) => {
          // Get steps for this branch
          const branchSteps = allSteps
            .filter((s) => s.parentStepId === step.id && s.branchId === branch.id)
            .sort((a, b) => a.position - b.position);

          const branchColor = branch.isDefault
            ? '#6B7280'
            : branchColors[index % branchColors.length];

          return (
            <div
              key={branch.id}
              className="flex flex-col items-center"
              style={{ width: branchSpacing }}
            >
              {/* Branch label */}
              <div
                className="px-2 py-0.5 rounded text-xs font-medium mb-2"
                style={{
                  backgroundColor: `${branchColor}33`,
                  color: branchColor,
                }}
              >
                {branch.name || `Branch ${index + 1}`}
              </div>

              {/* Add step button for this branch */}
              <AddStepButton afterStepId={step.id} branchId={branch.id} size="small" />

              {/* Branch steps */}
              {branchSteps.map((branchStep) => (
                <BranchStepNode
                  key={branchStep.id}
                  step={branchStep}
                  objectType={objectType}
                  branchId={branch.id}
                />
              ))}

              {/* End node for branch */}
              <Connector height={20} />
              <EndNode small />
            </div>
          );
        })}
      </div>
    </>
  );
}

/**
 * BranchStepNode - Step node inside a branch
 */
function BranchStepNode({ step, objectType, branchId }) {
  const { selectedStepId, selectStep, deleteStep } = useWorkflowBuilderStore();

  return (
    <>
      <Connector height={20} />
      <StepCard
        step={step}
        objectType={objectType}
        isSelected={selectedStepId === step.id}
        onClick={() => selectStep(step.id)}
        onDelete={() => deleteStep(step.id)}
      />
      <Connector height={20} />
      <AddStepButton afterStepId={step.id} branchId={branchId} size="small" />
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
        'rounded-lg border border-[var(--bb-color-border-subtle)]',
        'bg-[var(--bb-color-bg-elevated)]',
        'flex items-center justify-center',
        'text-[var(--bb-color-text-tertiary)]',
        small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
      )}
    >
      End
    </div>
  );
}
