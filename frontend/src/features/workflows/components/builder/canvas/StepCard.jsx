/**
 * StepCard - Step card component for the workflow canvas
 * Shows a single workflow step with its configuration summary
 */
import {
  Smartphone,
  Mail,
  Bell,
  CheckSquare,
  Edit3,
  UserPlus,
  UserMinus,
  LogIn,
  LogOut,
  Send,
  Clock,
  GitBranch,
  Shield,
  Square,
  Zap,
  Trash2,
  MoreHorizontal,
  AlertCircle,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { STEP_TYPES } from '../../../constants';
import { formatStepSummary } from '../../../utils/stepSummary';

// Icon mapping for action types
const ACTION_ICONS = {
  send_sms: Smartphone,
  send_email: Mail,
  send_notification: Bell,
  create_task: CheckSquare,
  update_field: Edit3,
  add_to_segment: UserPlus,
  remove_from_segment: UserMinus,
  enroll_in_workflow: LogIn,
  unenroll_from_workflow: LogOut,
  webhook: Send,
};

// Icon mapping for step types
const STEP_ICONS = {
  [STEP_TYPES.WAIT]: Clock,
  [STEP_TYPES.DETERMINATOR]: GitBranch,
  [STEP_TYPES.GATE]: Shield,
  [STEP_TYPES.TERMINUS]: Square,
};

// Color mapping for step types
const STEP_COLORS = {
  action: 'var(--bb-color-accent)',
  wait: '#F59E0B',
  determinator: '#8B5CF6',
  gate: '#EF4444',
  terminus: '#6B7280',
};

// Warning color for incomplete steps
const WARNING_COLOR = '#F59E0B';

export default function StepCard({
  step,
  isSelected,
  onClick,
  onDelete,
  objectType = 'pet',
  lookups = {},
  branchCount = null, // For determinators, show branch count
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Get configuration summary using utility
  const { summary, incomplete } = formatStepSummary(step, objectType, lookups);

  // Get icon component
  const Icon = step.actionType
    ? ACTION_ICONS[step.actionType] || Zap
    : STEP_ICONS[step.stepType] || Zap;

  // Get step color (yellow if incomplete)
  const color = incomplete
    ? WARNING_COLOR
    : step.stepType === STEP_TYPES.ACTION
      ? STEP_COLORS.action
      : STEP_COLORS[step.stepType] || STEP_COLORS.action;

  // Get border color based on state
  const getBorderClass = () => {
    if (isSelected) {
      return 'border-[var(--bb-color-accent)] shadow-lg';
    }
    if (incomplete) {
      return 'border-[#F59E0B] hover:border-[#D97706]';
    }
    return 'border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-strong)]';
  };

  // Terminus step has different styling
  if (step.stepType === STEP_TYPES.TERMINUS) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "w-24 py-3 rounded-lg cursor-pointer text-center",
          "bg-[var(--bb-color-bg-elevated)] border-2",
          "transition-all duration-150",
          isSelected
            ? "border-[var(--bb-color-accent)]"
            : "border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-strong)]"
        )}
      >
        <div className="flex flex-col items-center gap-1">
          <Square size={16} className="text-[var(--bb-color-text-tertiary)]" />
          <span className="text-xs text-[var(--bb-color-text-secondary)]">End</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-72 rounded-lg cursor-pointer group",
        "bg-[var(--bb-color-bg-elevated)] border-2",
        "transition-all duration-150",
        "hover:shadow-md hover:-translate-y-0.5",
        getBorderClass()
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <span className="text-sm font-medium text-[var(--bb-color-text-primary)] truncate">
            {step.name}
            {/* Show branch count for determinators */}
            {step.stepType === STEP_TYPES.DETERMINATOR && branchCount && (
              <span className="ml-1 text-[var(--bb-color-text-tertiary)]">
                ({branchCount})
              </span>
            )}
          </span>
          {/* Warning icon for incomplete steps */}
          {incomplete && (
            <AlertCircle
              size={14}
              className="flex-shrink-0"
              style={{ color: WARNING_COLOR }}
            />
          )}
        </div>

        {/* Actions menu */}
        <div
          ref={menuRef}
          className="relative flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              "p-1 rounded opacity-0 group-hover:opacity-100",
              "text-[var(--bb-color-text-tertiary)] hover:text-[var(--bb-color-text-primary)]",
              "hover:bg-[var(--bb-color-bg-surface)]",
              "transition-opacity"
            )}
          >
            <MoreHorizontal size={16} />
          </button>

          {showMenu && (
            <div className={cn(
              "absolute right-0 mt-1 w-32 z-50",
              "bg-[var(--bb-color-bg-elevated)] rounded-md",
              "border border-[var(--bb-color-border-subtle)]",
              "shadow-lg py-1"
            )}>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onClick?.();
                }}
                className={cn(
                  "w-full px-3 py-1.5 flex items-center gap-2 text-left",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "hover:bg-[var(--bb-color-bg-surface)]"
                )}
              >
                <Edit3 size={14} />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete?.();
                }}
                className={cn(
                  "w-full px-3 py-1.5 flex items-center gap-2 text-left",
                  "text-sm text-[var(--bb-color-status-negative)]",
                  "hover:bg-[var(--bb-color-bg-surface)]"
                )}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content - configuration summary */}
      <div className="px-4 pb-3">
        <div
          className={cn(
            "text-xs",
            incomplete
              ? "text-[#F59E0B]"
              : "text-[var(--bb-color-text-tertiary)]"
          )}
        >
          {summary}
        </div>
      </div>
    </div>
  );
}
