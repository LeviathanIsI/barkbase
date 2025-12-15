/**
 * EnrollmentHistoryTab - Enrollment history tab for workflow details
 * Shows all records enrolled in the workflow with status filters
 */
import { useState } from 'react';
import { ExternalLink, Filter, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import LoadingState from '@/components/ui/LoadingState';
import { useWorkflowExecutions } from '../../hooks';
import { EXECUTION_STATUS_CONFIG } from '../../constants';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'running', label: 'Running' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function EnrollmentHistoryTab({ workflowId }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useWorkflowExecutions(workflowId, {
    status: statusFilter || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const executions = data?.data?.executions || data?.executions || [];
  const total = data?.data?.total || data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Reset to page 1 when filter changes
  const handleFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setCurrentPage(1);
  };

  const hasFilters = statusFilter !== '';

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--bb-color-text-tertiary)]" />
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className={cn(
              "px-3 py-2 rounded-md text-sm",
              "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
              "text-[var(--bb-color-text-primary)]",
              "focus:outline-none focus:border-[var(--bb-color-accent)]"
            )}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-sm",
              "text-[var(--bb-color-accent)] hover:bg-[var(--bb-color-bg-surface)]"
            )}
          >
            <X size={14} />
            Clear filters
          </button>
        )}

        <div className="ml-auto text-sm text-[var(--bb-color-text-tertiary)]">
          {total.toLocaleString()} enrollment{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)] overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <LoadingState label="Loading enrollments..." />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-body)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                    Record
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                    Enrolled At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                    Current Step
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                    Completed At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-color-border-subtle)]">
                {executions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-[var(--bb-color-text-tertiary)]"
                    >
                      {hasFilters
                        ? 'No enrollments match the current filters'
                        : 'No enrollments found'}
                    </td>
                  </tr>
                ) : (
                  executions.map((execution) => {
                    const statusConfig = EXECUTION_STATUS_CONFIG[execution.status] || {};

                    return (
                      <tr
                        key={execution.id}
                        className="hover:bg-[var(--bb-color-bg-elevated)]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--bb-color-accent)]">
                              {execution.record_name || execution.record_id}
                            </span>
                            <ExternalLink
                              size={14}
                              className="text-[var(--bb-color-text-tertiary)]"
                            />
                          </div>
                          <span className="text-xs text-[var(--bb-color-text-tertiary)]">
                            {execution.record_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--bb-color-text-secondary)]">
                          {formatDateTime(execution.enrolled_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.color,
                            }}
                          >
                            {statusConfig.label || execution.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--bb-color-text-secondary)]">
                          {execution.current_step_name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--bb-color-text-secondary)]">
                          {execution.completed_at
                            ? formatDateTime(execution.completed_at)
                            : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[var(--bb-color-border-subtle)] flex items-center justify-between">
                <span className="text-sm text-[var(--bb-color-text-tertiary)]">
                  Showing {(currentPage - 1) * pageSize + 1} -{' '}
                  {Math.min(currentPage * pageSize, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className={cn(
                      'px-3 py-1 rounded text-sm',
                      'border border-[var(--bb-color-border-subtle)]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'hover:bg-[var(--bb-color-bg-elevated)]'
                    )}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-[var(--bb-color-text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className={cn(
                      'px-3 py-1 rounded text-sm',
                      'border border-[var(--bb-color-border-subtle)]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'hover:bg-[var(--bb-color-bg-elevated)]'
                    )}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function formatDateTime(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
