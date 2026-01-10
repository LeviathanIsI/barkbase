/**
 * WorkflowsTable - Table component for displaying workflows
 * Enterprise card-style rows with status, trigger info, actions
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTimezoneUtils } from '@/lib/timezone';
import {
  MoreHorizontal,
  Edit3,
  Copy,
  Trash2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  Calendar,
  User,
  CreditCard,
  CheckSquare,
  FileText,
  Zap,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  OBJECT_TYPE_CONFIG,
  WORKFLOW_STATUS_CONFIG,
  TRIGGER_TYPE_CONFIG,
} from '../constants';

// Icon mapping for object types
const OBJECT_TYPE_ICONS = {
  pet: PawPrint,
  booking: Calendar,
  owner: User,
  payment: CreditCard,
  task: CheckSquare,
  invoice: FileText,
};

// Format date for display (uses timezone formatter)
function formatDate(dateString, tzFormatDate) {
  if (!dateString) return '-';
  return tzFormatDate(dateString, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format relative time
function formatRelativeTime(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return null;
}

// Format number with commas
function formatNumber(num, isDraft = false) {
  if (num === null || num === undefined) {
    return isDraft ? '0' : '-';
  }
  return num.toLocaleString();
}

export default function WorkflowsTable({
  workflows = [],
  onActivate,
  onPause,
  onClone,
  onDelete,
  currentPage = 1,
  onPageChange,
  totalPages = 1,
}) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Card-style list */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="space-y-3">
          {workflows.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onCardClick={() => navigate(`/workflows/${workflow.id}`)}
              onActivate={() => onActivate?.(workflow.id)}
              onPause={() => onPause?.(workflow.id)}
              onClone={() => onClone?.(workflow.id)}
              onDelete={() => onDelete?.(workflow.id)}
            />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--bb-color-border-subtle)]">
          <div className="text-sm text-[var(--bb-color-text-tertiary)]">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                "p-2 rounded-lg",
                "text-[var(--bb-color-text-secondary)]",
                "hover:bg-[var(--bb-color-bg-surface)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                "p-2 rounded-lg",
                "text-[var(--bb-color-text-secondary)]",
                "hover:bg-[var(--bb-color-bg-surface)]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowCard({
  workflow,
  onCardClick,
  onActivate,
  onPause,
  onClone,
  onDelete,
}) {
  const tz = useTimezoneUtils();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Update menu position when opening
  const handleToggleMenu = () => {
    if (!isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 176,
      });
    }
    setIsMenuOpen(!isMenuOpen);
  };

  // Handle both camelCase (from apiClient) and snake_case (raw) keys
  const objectType = workflow.objectType || workflow.object_type || 'pet';
  const triggerType = workflow.triggerType || workflow.trigger_type || 'manual';
  const ObjectIcon = OBJECT_TYPE_ICONS[objectType] || PawPrint;
  const objectConfig = OBJECT_TYPE_CONFIG[objectType] || {};
  const triggerConfig = TRIGGER_TYPE_CONFIG[triggerType] || {};
  const statusConfig = WORKFLOW_STATUS_CONFIG[workflow.status] || WORKFLOW_STATUS_CONFIG.draft;
  const isActive = workflow.status === 'active';
  const isDraft = workflow.status === 'draft';
  const isPaused = workflow.status === 'paused';

  // Support both camelCase and snake_case for these fields
  const createdAt = workflow.createdAt || workflow.created_at;
  const lastRunAt = workflow.lastRunAt || workflow.last_run_at;
  const enrolledCount = workflow.enrolledCount ?? workflow.enrolled_count ?? 0;
  const enrolledLast7Days = workflow.enrolledLast7Days ?? workflow.enrolled_last_7_days ?? 0;
  const stepCount = workflow.stepCount ?? workflow.step_count ?? 0;

  const relativeLastRun = formatRelativeTime(lastRunAt);

  return (
    <div
      className={cn(
        'group relative rounded-xl border p-4 cursor-pointer transition-all duration-200',
        'bg-[var(--bb-color-bg-surface)]',
        isActive && 'border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700',
        isPaused && 'border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700 opacity-75',
        isDraft && 'border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-accent)]',
        'hover:shadow-md hover:-translate-y-0.5'
      )}
      onClick={onCardClick}
    >
      {/* Status indicator bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: statusConfig.color }}
      />

      <div className="flex items-start justify-between gap-4 pl-3">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Workflow icon */}
          <div
            className={cn(
              'h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0',
              isActive && 'bg-gradient-to-br from-emerald-500 to-emerald-600',
              isPaused && 'bg-gradient-to-br from-red-400 to-red-500',
              isDraft && 'bg-gradient-to-br from-gray-400 to-gray-500'
            )}
          >
            <Zap className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-[var(--bb-color-text-primary)] truncate group-hover:text-[var(--bb-color-accent)]">
                {workflow.name}
              </h3>
              {/* Status badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                )}
                style={{
                  backgroundColor: statusConfig.bgColor,
                  color: statusConfig.color,
                }}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isActive && "animate-pulse"
                  )}
                  style={{ backgroundColor: statusConfig.color }}
                />
                {statusConfig.label}
              </span>
            </div>

            {/* Description */}
            {workflow.description && (
              <p className="text-sm text-[var(--bb-color-text-muted)] mb-2 line-clamp-1">
                {workflow.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 text-xs flex-wrap">
              {/* Object type */}
              <div className="flex items-center gap-1.5">
                <ObjectIcon
                  size={14}
                  style={{ color: objectConfig.color }}
                />
                <span className="text-[var(--bb-color-text-secondary)]">
                  {objectConfig.label || objectType}
                </span>
              </div>

              {/* Trigger type */}
              <div className="flex items-center gap-1.5 text-[var(--bb-color-text-muted)]">
                <Play size={12} className="text-emerald-500" />
                <span>{triggerConfig.label || 'Manual'}</span>
              </div>

              {/* Step count */}
              {stepCount > 0 && (
                <div className="flex items-center gap-1.5 text-[var(--bb-color-text-muted)]">
                  <ArrowRight size={12} />
                  <span>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
                </div>
              )}

              {/* Created date */}
              <div className="flex items-center gap-1.5 text-[var(--bb-color-text-muted)]">
                <Clock size={12} />
                <span>Created {formatDate(createdAt, tz.formatDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Stats and actions */}
        <div className="flex items-start gap-6">
          {/* Enrollment stats */}
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1 justify-end mb-0.5">
              <TrendingUp size={12} className="text-[var(--bb-color-text-muted)]" />
              <span className="text-lg font-bold text-[var(--bb-color-text-primary)]">
                {formatNumber(enrolledCount, isDraft)}
              </span>
            </div>
            <p className="text-xs text-[var(--bb-color-text-muted)]">
              enrolled total
            </p>
            {enrolledLast7Days > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                +{enrolledLast7Days} this week
              </p>
            )}
          </div>

          {/* Last run */}
          {isActive && lastRunAt && (
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                {relativeLastRun || formatDate(lastRunAt, tz.formatDate)}
              </p>
              <p className="text-xs text-[var(--bb-color-text-muted)]">last run</p>
            </div>
          )}

          {/* Quick toggle and menu */}
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* Quick activate/pause toggle */}
            {!isDraft && (
              <button
                onClick={isActive ? onPause : onActivate}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                    : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                )}
                title={isActive ? 'Pause workflow' : 'Activate workflow'}
              >
                {isActive ? <Pause size={16} /> : <Play size={16} />}
              </button>
            )}

            {/* More actions menu */}
            <button
              ref={buttonRef}
              onClick={handleToggleMenu}
              className={cn(
                "p-2 rounded-lg",
                "text-[var(--bb-color-text-tertiary)]",
                "hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]",
                "transition-colors"
              )}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown menu rendered in portal */}
      {isMenuOpen && createPortal(
        <div
          ref={menuRef}
          className={cn(
            "fixed w-48",
            "bg-[var(--bb-color-bg-elevated)] rounded-xl",
            "border border-[var(--bb-color-border-subtle)]",
            "shadow-lg",
            "py-1 overflow-hidden"
          )}
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 9999,
          }}
        >
          <button
            onClick={() => {
              setIsMenuOpen(false);
              onCardClick?.();
            }}
            className={cn(
              "w-full px-4 py-2.5 flex items-center gap-3 text-left",
              "text-sm text-[var(--bb-color-text-primary)]",
              "hover:bg-[var(--bb-color-bg-surface)]"
            )}
          >
            <Edit3 size={16} className="text-[var(--bb-color-text-muted)]" />
            Edit workflow
          </button>

          {isActive ? (
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onPause?.();
              }}
              className={cn(
                "w-full px-4 py-2.5 flex items-center gap-3 text-left",
                "text-sm text-[var(--bb-color-text-primary)]",
                "hover:bg-[var(--bb-color-bg-surface)]"
              )}
            >
              <Pause size={16} className="text-red-500" />
              Pause workflow
            </button>
          ) : (
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onActivate?.();
              }}
              className={cn(
                "w-full px-4 py-2.5 flex items-center gap-3 text-left",
                "text-sm text-[var(--bb-color-text-primary)]",
                "hover:bg-[var(--bb-color-bg-surface)]"
              )}
            >
              <Play size={16} className="text-emerald-500" />
              Activate workflow
            </button>
          )}

          <button
            onClick={() => {
              setIsMenuOpen(false);
              onClone?.();
            }}
            className={cn(
              "w-full px-4 py-2.5 flex items-center gap-3 text-left",
              "text-sm text-[var(--bb-color-text-primary)]",
              "hover:bg-[var(--bb-color-bg-surface)]"
            )}
          >
            <Copy size={16} className="text-[var(--bb-color-text-muted)]" />
            Clone workflow
          </button>

          <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />

          <button
            onClick={() => {
              setIsMenuOpen(false);
              onDelete?.();
            }}
            className={cn(
              "w-full px-4 py-2.5 flex items-center gap-3 text-left",
              "text-sm text-red-600 dark:text-red-400",
              "hover:bg-red-50 dark:hover:bg-red-950/20"
            )}
          >
            <Trash2 size={16} />
            Delete workflow
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
