/**
 * WorkflowsTable - Table component for displaying workflows
 * enterprise table with columns for name, object type, created, enrolled, status
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
} from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  OBJECT_TYPE_CONFIG,
  WORKFLOW_STATUS_CONFIG,
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

// Format number with commas
// For draft workflows, show '0' instead of '-' for null/undefined counts
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
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[var(--bb-color-bg-surface)] border-b border-[var(--bb-color-border-subtle)]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wider">
                Object Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wider">
                Created On
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wider">
                Enrolled Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wider">
                Last 7 Days
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--bb-color-text-secondary)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--bb-color-border-subtle)]">
            {workflows.map((workflow) => (
              <WorkflowRow
                key={workflow.id}
                workflow={workflow}
                onRowClick={() => navigate(`/workflows/${workflow.id}`)}
                onActivate={() => onActivate?.(workflow.id)}
                onPause={() => onPause?.(workflow.id)}
                onClone={() => onClone?.(workflow.id)}
                onDelete={() => onDelete?.(workflow.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--bb-color-border-subtle)]">
          <div className="text-sm text-[var(--bb-color-text-tertiary)]">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage === 1}
              className={cn(
                "p-1.5 rounded",
                "text-[var(--bb-color-text-secondary)]",
                "hover:bg-[var(--bb-color-bg-surface)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={cn(
                "p-1.5 rounded",
                "text-[var(--bb-color-text-secondary)]",
                "hover:bg-[var(--bb-color-bg-surface)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
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

function WorkflowRow({
  workflow,
  onRowClick,
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
        left: rect.right - 176, // 176px = w-44 (11rem)
      });
    }
    setIsMenuOpen(!isMenuOpen);
  };

  // Handle both camelCase (from apiClient) and snake_case (raw) keys
  const objectType = workflow.objectType || workflow.object_type || 'pet';
  const ObjectIcon = OBJECT_TYPE_ICONS[objectType] || PawPrint;
  const objectConfig = OBJECT_TYPE_CONFIG[objectType] || {};
  const statusConfig = WORKFLOW_STATUS_CONFIG[workflow.status] || WORKFLOW_STATUS_CONFIG.draft;
  const isActive = workflow.status === 'active';
  const isDraft = workflow.status === 'draft';

  // Support both camelCase and snake_case for these fields
  const createdAt = workflow.createdAt || workflow.created_at;
  const enrolledCount = workflow.enrolledCount ?? workflow.enrolled_count;
  const enrolledLast7Days = workflow.enrolledLast7Days ?? workflow.enrolled_last_7_days;

  return (
    <tr
      className={cn(
        "group cursor-pointer",
        "hover:bg-[var(--bb-color-bg-surface)]",
        "transition-colors duration-100"
      )}
      onClick={onRowClick}
    >
      {/* Name */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-[var(--bb-color-accent)] hover:underline">
          {workflow.name}
        </span>
        {workflow.description && (
          <p className="text-xs text-[var(--bb-color-text-tertiary)] mt-0.5 truncate max-w-xs">
            {workflow.description}
          </p>
        )}
      </td>

      {/* Object Type */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <ObjectIcon
            size={16}
            style={{ color: objectConfig.color }}
          />
          <span className="text-sm text-[var(--bb-color-text-primary)]">
            {objectConfig.label || objectType}
          </span>
        </div>
      </td>

      {/* Created On */}
      <td className="px-4 py-3">
        <span className="text-sm text-[var(--bb-color-text-secondary)]">
          {formatDate(createdAt, tz.formatDate)}
        </span>
      </td>

      {/* Enrolled Total */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-[var(--bb-color-text-primary)]">
          {formatNumber(enrolledCount, isDraft)}
        </span>
      </td>

      {/* Last 7 Days */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm text-[var(--bb-color-text-secondary)]">
          {formatNumber(enrolledLast7Days, isDraft)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex justify-center">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
            )}
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: statusConfig.color }}
            />
            {statusConfig.label}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <div
          className="relative inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            ref={buttonRef}
            onClick={handleToggleMenu}
            className={cn(
              "p-1.5 rounded",
              "text-[var(--bb-color-text-tertiary)]",
              "hover:bg-[var(--bb-color-bg-elevated)] hover:text-[var(--bb-color-text-primary)]",
              "transition-colors"
            )}
          >
            <MoreHorizontal size={18} />
          </button>

          {/* Dropdown menu rendered in portal to avoid overflow clipping */}
          {isMenuOpen && createPortal(
            <div
              ref={menuRef}
              className={cn(
                "fixed w-44",
                "bg-[var(--bb-color-bg-elevated)] rounded-md",
                "border border-[var(--bb-color-border-subtle)]",
                "shadow-lg",
                "py-1"
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
                  onRowClick?.();
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-left",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "hover:bg-[var(--bb-color-bg-surface)]"
                )}
              >
                <Edit3 size={14} />
                Edit
              </button>

              {isActive ? (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onPause?.();
                  }}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-left",
                    "text-sm text-[var(--bb-color-text-primary)]",
                    "hover:bg-[var(--bb-color-bg-surface)]"
                  )}
                >
                  <Pause size={14} />
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onActivate?.();
                  }}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-left",
                    "text-sm text-[var(--bb-color-text-primary)]",
                    "hover:bg-[var(--bb-color-bg-surface)]"
                  )}
                >
                  <Play size={14} />
                  Activate
                </button>
              )}

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onClone?.();
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-left",
                  "text-sm text-[var(--bb-color-text-primary)]",
                  "hover:bg-[var(--bb-color-bg-surface)]"
                )}
              >
                <Copy size={14} />
                Clone
              </button>

              <div className="border-t border-[var(--bb-color-border-subtle)] my-1" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onDelete?.();
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-left",
                  "text-sm text-[var(--bb-color-status-negative)]",
                  "hover:bg-[var(--bb-color-bg-surface)]"
                )}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>,
            document.body
          )}
        </div>
      </td>
    </tr>
  );
}
