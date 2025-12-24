/**
 * BuilderHeader - Header component for the workflow builder
 * Includes back button, editable workflow name, save status indicator, menu bar, and publish CTA
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import { useWorkflowBuilderStore } from '../../stores/builderStore';
import { WORKFLOW_STATUS_CONFIG } from '../../constants';
import MenuBar from './MenuBar';

/**
 * Save status indicator component with improved styling
 */
function SaveStatusIndicator({ status, isDirty }) {
  // Show unsaved indicator if dirty and not currently saving
  if (isDirty && status !== 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-[#F59E0B] text-sm">
        <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
        <span>Unsaved changes</span>
      </div>
    );
  }

  switch (status) {
    case 'saving':
      return (
        <div className="flex items-center gap-1.5 text-[var(--bb-color-text-tertiary)] text-sm">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Saving...</span>
        </div>
      );
    case 'saved':
      return (
        <div className="flex items-center gap-1.5 text-[#10B981] text-sm">
          <Check className="w-3.5 h-3.5" />
          <span>Saved</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1.5 text-[#EF4444] text-sm">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Save failed</span>
        </div>
      );
    default:
      return null;
  }
}

/**
 * Workflow status badge component
 */
function WorkflowStatusBadge({ status }) {
  const config = WORKFLOW_STATUS_CONFIG[status] || WORKFLOW_STATUS_CONFIG.draft;

  return (
    <span
      className="px-2 py-0.5 text-xs rounded-full font-medium"
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
      }}
    >
      {config.label}
    </span>
  );
}

/**
 * Publish button component with dropdown for active workflows
 */
function PublishButton({ workflow, canPublish, onPublish, onPause, onResume, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (workflow.status === 'active') {
    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium',
            'bg-[#10B981] hover:bg-[#059669] text-white',
            'transition-colors'
          )}
        >
          <Play size={14} />
          <span>Active</span>
          <ChevronDown size={14} />
        </button>

        {isOpen && (
          <div
            className={cn(
              'absolute top-full right-0 mt-1 w-48 z-50',
              'bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]',
              'rounded-lg shadow-xl py-1'
            )}
          >
            <button
              onClick={() => {
                onPause?.();
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-3 py-1.5 text-left text-sm flex items-center gap-2',
                'text-[var(--bb-color-text-primary)] hover:bg-[var(--bb-color-bg-surface)]'
              )}
            >
              <Pause size={14} />
              Pause workflow
            </button>
          </div>
        )}
      </div>
    );
  }

  if (workflow.status === 'paused') {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={onResume}
        loading={isLoading}
        leftIcon={<Play size={14} />}
        className="bg-[#10B981] hover:bg-[#059669]"
      >
        Resume
      </Button>
    );
  }

  // Draft status - show Review and publish button
  return (
    <Button
      variant="primary"
      size="sm"
      onClick={onPublish}
      disabled={!canPublish}
      loading={isLoading}
    >
      Review and publish
    </Button>
  );
}

export default function BuilderHeader({
  onActivate,
  onPause,
  onResume,
  onOpenPublishModal,
  onSave,
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSettings,
  onToggleLeftPanel,
  showLeftPanel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onShowShortcuts,
  isPublishing,
}) {
  const navigate = useNavigate();
  const {
    workflow,
    isDirty,
    saveStatus,
    setWorkflowName,
    hasTrigger,
  } = useWorkflowBuilderStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(workflow.name);
  const nameInputRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Update edited name when workflow name changes
  useEffect(() => {
    setEditedName(workflow.name);
  }, [workflow.name]);

  const handleNameSubmit = () => {
    if (editedName.trim()) {
      setWorkflowName(editedName.trim());
    } else {
      setEditedName(workflow.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditedName(workflow.name);
      setIsEditingName(false);
    }
  };

  const handleBack = () => {
    // Auto-save handles persistence, so we can navigate directly
    // Only warn if currently saving to avoid data loss
    if (saveStatus === 'saving') {
      if (window.confirm('Changes are being saved. Are you sure you want to leave?')) {
        navigate('/workflows');
      }
    } else {
      navigate('/workflows');
    }
  };

  const canPublish = hasTrigger() && workflow.id;

  return (
    <div className="flex flex-col border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)]">
      {/* Main header row */}
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left side - Back button */}
        <button
          onClick={handleBack}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded',
            'text-sm font-medium text-[var(--bb-color-text-primary)]',
            'hover:bg-[var(--bb-color-bg-elevated)]',
            'transition-colors'
          )}
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* Center - Workflow name + Status badge + Save status */}
        <div className="flex items-center gap-3">
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameKeyDown}
              className={cn(
                'px-2 py-1 text-lg font-semibold text-center',
                'bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-accent)]',
                'rounded focus:outline-none',
                'text-[var(--bb-color-text-primary)]'
              )}
              style={{ width: `${Math.max(editedName.length, 10)}ch` }}
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className={cn(
                'flex items-center gap-2 px-2 py-1 rounded',
                'hover:bg-[var(--bb-color-bg-elevated)]',
                'transition-colors group'
              )}
            >
              <span className="text-lg font-semibold text-[var(--bb-color-text-primary)]">
                {workflow.name}
              </span>
              <Pencil
                size={14}
                className="text-[var(--bb-color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </button>
          )}

          {/* Workflow status badge */}
          <WorkflowStatusBadge status={workflow.status} />

          {/* Save status indicator */}
          <SaveStatusIndicator status={saveStatus} isDirty={isDirty} />
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          <PublishButton
            workflow={workflow}
            canPublish={canPublish}
            onPublish={onOpenPublishModal || onActivate}
            onPause={onPause}
            onResume={onResume}
            isLoading={isPublishing}
          />
        </div>
      </div>

      {/* Menu bar row */}
      <MenuBar
        workflow={workflow}
        onSave={onSave}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onOpenSettings={onOpenSettings}
        onToggleLeftPanel={onToggleLeftPanel}
        showLeftPanel={showLeftPanel}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
        onExit={handleBack}
        onShowShortcuts={onShowShortcuts}
      />
    </div>
  );
}
