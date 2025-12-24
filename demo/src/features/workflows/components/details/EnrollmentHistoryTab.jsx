/**
 * EnrollmentHistoryTab - Enrollment history tab for workflow details
 * Shows all records enrolled in the workflow with status filters
 * Includes error details and retry functionality for failed executions
 */
import { useState } from 'react';
import { ExternalLink, Filter, X, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/cn';
import LoadingState from '@/components/ui/LoadingState';
import Button from '@/components/ui/Button';
import { useWorkflowExecutions, useRetryExecution } from '../../hooks';
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
  const [expandedRows, setExpandedRows] = useState(new Set());
  const pageSize = 25;

  const { data, isLoading, refetch } = useWorkflowExecutions(workflowId, {
    status: statusFilter || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const retryMutation = useRetryExecution();

  const executions = data?.data?.executions || data?.executions || [];
  const total = data?.data?.total || data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const failedCount = data?.data?.failedCount || data?.failedCount || 0;

  // Reset to page 1 when filter changes
  const handleFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setCurrentPage(1);
  };

  const toggleRow = (executionId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(executionId)) {
        next.delete(executionId);
      } else {
        next.add(executionId);
      }
      return next;
    });
  };

  const handleRetry = async (executionId) => {
    try {
      await retryMutation.mutateAsync({ workflowId, executionId });
      toast.success('Execution retried successfully');
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to retry execution');
    }
  };

  const handleRetryAll = async () => {
    try {
      await retryMutation.mutateAsync({ workflowId, retryAll: true });
      toast.success('All failed executions queued for retry');
      refetch();
    } catch (error) {
      toast.error(error.message || 'Failed to retry executions');
    }
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

        <div className="ml-auto flex items-center gap-4">
          {failedCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetryAll}
              loading={retryMutation.isPending}
              leftIcon={<RefreshCw size={14} />}
            >
              Retry all failed ({failedCount})
            </Button>
          )}
          <span className="text-sm text-[var(--bb-color-text-tertiary)]">
            {total.toLocaleString()} enrollment{total !== 1 ? 's' : ''}
            {failedCount > 0 && (
              <span className="ml-2 text-red-400">
                ({failedCount} failed)
              </span>
            )}
          </span>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase w-8">
                  </th>
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
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--bb-color-border-subtle)]">
                {executions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
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
                    const isFailed = execution.status === 'failed';
                    const isExpanded = expandedRows.has(execution.id);
                    const hasErrorDetails = isFailed && execution.error_details;

                    return (
                      <>
                        <tr
                          key={execution.id}
                          className={cn(
                            "hover:bg-[var(--bb-color-bg-elevated)]",
                            isFailed && "bg-red-500/5"
                          )}
                        >
                          {/* Expand toggle */}
                          <td className="px-4 py-3 w-8">
                            {hasErrorDetails && (
                              <button
                                onClick={() => toggleRow(execution.id)}
                                className="text-[var(--bb-color-text-tertiary)] hover:text-[var(--bb-color-text-primary)]"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                          </td>
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
                          <td className="px-4 py-3 text-right">
                            {isFailed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRetry(execution.id)}
                                loading={retryMutation.isPending}
                                leftIcon={<RefreshCw size={14} />}
                              >
                                Retry
                              </Button>
                            )}
                          </td>
                        </tr>
                        {/* Expanded error details row */}
                        {isExpanded && hasErrorDetails && (
                          <tr key={`${execution.id}-details`} className="bg-red-500/5">
                            <td colSpan={7} className="px-4 py-3">
                              <ErrorDetailsPanel errorDetails={execution.error_details} />
                            </td>
                          </tr>
                        )}
                      </>
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

/**
 * ErrorDetailsPanel - Displays error details for failed executions
 */
function ErrorDetailsPanel({ errorDetails }) {
  // Parse error details if it's a string
  const details = typeof errorDetails === 'string'
    ? JSON.parse(errorDetails)
    : errorDetails;

  return (
    <div className="ml-8 space-y-2">
      <div className="flex items-center gap-2 text-red-400">
        <AlertCircle size={16} />
        <span className="font-medium text-sm">Error Details</span>
      </div>

      <div className="bg-[var(--bb-color-bg-body)] rounded-md p-3 space-y-2 text-sm">
        {details.lastError && (
          <div>
            <span className="text-[var(--bb-color-text-tertiary)]">Error: </span>
            <span className="text-red-400">{details.lastError}</span>
          </div>
        )}

        {details.retryAttempts !== undefined && (
          <div>
            <span className="text-[var(--bb-color-text-tertiary)]">Retry Attempts: </span>
            <span className="text-[var(--bb-color-text-primary)]">{details.retryAttempts}</span>
          </div>
        )}

        {details.failedAt && (
          <div>
            <span className="text-[var(--bb-color-text-tertiary)]">Failed At: </span>
            <span className="text-[var(--bb-color-text-primary)]">
              {new Date(details.failedAt).toLocaleString()}
            </span>
          </div>
        )}

        {details.stepId && (
          <div>
            <span className="text-[var(--bb-color-text-tertiary)]">Failed Step: </span>
            <span className="text-[var(--bb-color-text-primary)]">{details.action || details.stepId}</span>
          </div>
        )}

        {details.sourceQueue && (
          <div>
            <span className="text-[var(--bb-color-text-tertiary)]">Source: </span>
            <span className="text-[var(--bb-color-text-primary)]">{details.sourceQueue}</span>
          </div>
        )}

        {details.messageId && (
          <div>
            <span className="text-[var(--bb-color-text-tertiary)]">Message ID: </span>
            <span className="text-[var(--bb-color-text-primary)] font-mono text-xs">{details.messageId}</span>
          </div>
        )}
      </div>
    </div>
  );
}
