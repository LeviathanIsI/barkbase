/**
 * EnrollmentHistoryTab - Enrollment history tab for workflow details
 */
import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/cn';
import LoadingState from '@/components/ui/LoadingState';
import { useWorkflowExecutions } from '../../hooks';
import { EXECUTION_STATUS_CONFIG } from '../../constants';

export default function EnrollmentHistoryTab({ workflowId }) {
  const [statusFilter, setStatusFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const { data, isLoading } = useWorkflowExecutions(workflowId, {
    status: statusFilter,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const executions = data?.data?.executions || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return <LoadingState label="Loading enrollment history..." />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--bb-color-text-secondary)]">Status:</span>
        <div className="flex gap-1">
          {[null, 'running', 'waiting', 'completed', 'failed', 'cancelled'].map((status) => (
            <button
              key={status || 'all'}
              onClick={() => {
                setStatusFilter(status);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 rounded text-sm",
                statusFilter === status
                  ? "bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]"
                  : "text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-surface)]"
              )}
            >
              {status ? EXECUTION_STATUS_CONFIG[status]?.label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--bb-color-border-subtle)]">
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
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--bb-color-text-tertiary)]">
                  No enrollments found
                </td>
              </tr>
            ) : (
              executions.map((execution) => {
                const statusConfig = EXECUTION_STATUS_CONFIG[execution.status] || {};

                return (
                  <tr key={execution.id} className="hover:bg-[var(--bb-color-bg-elevated)]">
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
                      {formatDate(execution.enrolled_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: statusConfig.bgColor,
                          color: statusConfig.color,
                        }}
                      >
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--bb-color-text-secondary)]">
                      {execution.current_step_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--bb-color-text-secondary)]">
                      {execution.completed_at ? formatDate(execution.completed_at) : '-'}
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
              Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  "border border-[var(--bb-color-border-subtle)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "hover:bg-[var(--bb-color-bg-elevated)]"
                )}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  "px-3 py-1 rounded text-sm",
                  "border border-[var(--bb-color-border-subtle)]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "hover:bg-[var(--bb-color-bg-elevated)]"
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}
