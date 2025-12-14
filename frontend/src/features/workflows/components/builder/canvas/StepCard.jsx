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
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { STEP_TYPES } from '../../../constants';

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

export default function StepCard({
  step,
  isSelected,
  onClick,
  onDelete,
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

  // Get icon component
  const Icon = step.actionType
    ? ACTION_ICONS[step.actionType] || Zap
    : STEP_ICONS[step.stepType] || Zap;

  // Get step color
  const color = step.stepType === STEP_TYPES.ACTION
    ? STEP_COLORS.action
    : STEP_COLORS[step.stepType] || STEP_COLORS.action;

  // Get configuration summary
  const getConfigSummary = () => {
    if (step.stepType === STEP_TYPES.WAIT) {
      const { duration, durationUnit } = step.config || {};
      if (duration && durationUnit) {
        return `Wait ${duration} ${durationUnit}`;
      }
      return 'Configure wait';
    }

    if (step.stepType === STEP_TYPES.DETERMINATOR) {
      const { conditions } = step.config || {};
      if (conditions?.length > 0) {
        return `${conditions.length} condition${conditions.length > 1 ? 's' : ''}`;
      }
      return 'Configure conditions';
    }

    if (step.stepType === STEP_TYPES.GATE) {
      return 'Gate condition';
    }

    if (step.stepType === STEP_TYPES.TERMINUS) {
      return 'End of workflow';
    }

    // Action steps
    return step.name || 'Configure action';
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
        isSelected
          ? "border-[var(--bb-color-accent)] shadow-lg"
          : "border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-border-strong)]"
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
            {step.name}
          </span>
        </div>

        {/* Actions menu */}
        <div
          ref={menuRef}
          className="relative"
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

      {/* Content */}
      <div className="px-4 pb-3">
        <div className="text-xs text-[var(--bb-color-text-tertiary)]">
          {getConfigSummary()}
        </div>
      </div>
    </div>
  );
}
