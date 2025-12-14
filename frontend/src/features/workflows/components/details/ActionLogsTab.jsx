/**
 * ActionLogsTab - Execution logs tab for workflow details
 */
import { useState } from 'react';
import { ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import LoadingState from '@/components/ui/LoadingState';
import { useWorkflowHistory } from '../../hooks';

const EVENT_TYPE_CONFIG = {
  enrolled: { label: 'Enrolled', icon: Clock, color: '#3B82F6' },
  step_started: { label: 'Step Started', icon: Clock, color: '#F59E0B' },
  step_completed: { label: 'Step Completed', icon: CheckCircle, color: '#10B981' },
  step_failed: { label: 'Step Failed', icon: XCircle, color: '#EF4444' },
  completed: { label: 'Completed', icon: CheckCircle, color: '#10B981' },
  failed: { label: 'Failed', icon: XCircle, color: '#EF4444' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: '#6B7280' },
};

export default function ActionLogsTab({ workflowId }) {
  const [eventTypeFilter, setEventTypeFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState(null);
  const pageSize = 50;

  const { data, isLoading } = useWorkflowHistory(workflowId, {
    eventType: eventTypeFilter,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const logs = data?.data?.logs || [];
  const total = data?.data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return <LoadingState label="Loading action logs..." />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--bb-color-text-secondary)]">Event:</span>
        <div className="flex gap-1">
          {[null, 'enrolled', 'step_completed', 'step_failed', 'completed'].map((type) => (
            <button
              key={type || 'all'}
              onClick={() => {
                setEventTypeFilter(type);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 rounded text-sm",
                eventTypeFilter === type
                  ? "bg-[var(--bb-color-accent-soft)] text-[var(--bb-color-accent)]"
                  : "text-[var(--bb-color-text-secondary)] hover:bg-[var(--bb-color-bg-surface)]"
              )}
            >
              {type ? EVENT_TYPE_CONFIG[type]?.label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs list */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)]">
        {logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--bb-color-text-tertiary)]">
            No logs found
          </div>
        ) : (
          <div className="divide-y divide-[var(--bb-color-border-subtle)]">
            {logs.map((log) => {
              const eventConfig = EVENT_TYPE_CONFIG[log.event_type] || {};
              const Icon = eventConfig.icon || Clock;
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id}>
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center gap-4 text-left",
                      "hover:bg-[var(--bb-color-bg-elevated)]"
                    )}
                  >
                    {/* Event icon */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${eventConfig.color}20` }}
                    >
                      <Icon size={16} style={{ color: eventConfig.color }} />
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                          {eventConfig.label}
                        </span>
                        {log.step_name && (
                          <span className="text-sm text-[var(--bb-color-text-secondary)]">
                            - {log.step_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--bb-color-text-tertiary)]">
                        <span>{log.record_name || log.record_id}</span>
                        <span>{formatDateTime(log.created_at)}</span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <ChevronRight
                      size={16}
                      className={cn(
                        "text-[var(--bb-color-text-tertiary)] transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 py-3 bg-[var(--bb-color-bg-body)] border-t border-[var(--bb-color-border-subtle)]">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
                            Execution ID
                          </div>
                          <div className="font-mono text-[var(--bb-color-text-secondary)]">
                            {log.execution_id}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
                            Duration
                          </div>
                          <div className="text-[var(--bb-color-text-secondary)]">
                            {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                          </div>
                        </div>
                        {log.error_message && (
                          <div className="col-span-2">
                            <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
                              Error
                            </div>
                            <div className="text-[var(--bb-color-status-negative)] font-mono text-xs p-2 bg-[var(--bb-color-bg-elevated)] rounded">
                              {log.error_message}
                            </div>
                          </div>
                        )}
                        {log.result && (
                          <div className="col-span-2">
                            <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
                              Result
                            </div>
                            <pre className="text-xs font-mono text-[var(--bb-color-text-secondary)] p-2 bg-[var(--bb-color-bg-elevated)] rounded overflow-auto max-h-32">
                              {JSON.stringify(log.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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

function formatDateTime(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString();
}
