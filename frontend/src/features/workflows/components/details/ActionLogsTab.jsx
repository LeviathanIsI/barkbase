/**
 * ActionLogsTab - Execution logs tab for workflow details
 * Shows detailed action logs with date range and status filters
 */
import { useState } from 'react';
import { ChevronRight, CheckCircle, XCircle, Clock, Filter, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';
import LoadingState from '@/components/ui/LoadingState';
import { useWorkflowHistory } from '../../hooks';

const EVENT_TYPE_CONFIG = {
  enrolled: { label: 'Enrolled', icon: Clock, color: '#3B82F6' },
  step_started: { label: 'Step Started', icon: Clock, color: '#F59E0B' },
  step_completed: { label: 'Step Completed', icon: CheckCircle, color: '#10B981' },
  step_failed: { label: 'Step Failed', icon: XCircle, color: '#EF4444' },
  step_skipped: { label: 'Step Skipped', icon: XCircle, color: '#6B7280' },
  unenrolled: { label: 'Unenrolled', icon: XCircle, color: '#6B7280' },
  goal_met: { label: 'Goal Met', icon: CheckCircle, color: '#8B5CF6' },
  completed: { label: 'Completed', icon: CheckCircle, color: '#10B981' },
  failed: { label: 'Failed', icon: XCircle, color: '#EF4444' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: '#6B7280' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'step_completed', label: 'Step Completed' },
  { value: 'step_failed', label: 'Step Failed' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

export default function ActionLogsTab({ workflowId }) {
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState(null);
  const pageSize = 50;

  const { data, isLoading } = useWorkflowHistory(workflowId, {
    eventType: eventTypeFilter || undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  const logs = data?.data?.logs || data?.logs || [];
  const total = data?.data?.total || data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleFilterChange = (field, value) => {
    if (field === 'eventType') {
      setEventTypeFilter(value);
    } else if (field === 'startDate') {
      setDateRange((prev) => ({ ...prev, start: value }));
    } else if (field === 'endDate') {
      setDateRange((prev) => ({ ...prev, end: value }));
    }
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setEventTypeFilter('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  const hasFilters = eventTypeFilter !== '' || dateRange.start || dateRange.end;

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--bb-color-text-tertiary)]" />
          <select
            value={eventTypeFilter}
            onChange={(e) => handleFilterChange('eventType', e.target.value)}
            className={cn(
              'px-3 py-2 rounded-md text-sm',
              'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
              'text-[var(--bb-color-text-primary)]',
              'focus:outline-none focus:border-[var(--bb-color-accent)]'
            )}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-[var(--bb-color-text-tertiary)]" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            placeholder="From"
            className={cn(
              'px-3 py-2 rounded-md text-sm',
              'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
              'text-[var(--bb-color-text-primary)]',
              'focus:outline-none focus:border-[var(--bb-color-accent)]'
            )}
          />
          <span className="text-[var(--bb-color-text-tertiary)]">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            placeholder="To"
            className={cn(
              'px-3 py-2 rounded-md text-sm',
              'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
              'text-[var(--bb-color-text-primary)]',
              'focus:outline-none focus:border-[var(--bb-color-accent)]'
            )}
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-sm',
              'text-[var(--bb-color-accent)] hover:bg-[var(--bb-color-bg-surface)]'
            )}
          >
            <X size={14} />
            Clear filters
          </button>
        )}

        <div className="ml-auto text-sm text-[var(--bb-color-text-tertiary)]">
          {total.toLocaleString()} log{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)] overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <LoadingState label="Loading action logs..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--bb-color-text-tertiary)]">
            {hasFilters ? 'No logs match the current filters' : 'No logs found'}
          </div>
        ) : (
          <div className="divide-y divide-[var(--bb-color-border-subtle)]">
            {logs.map((log) => {
              const eventConfig = EVENT_TYPE_CONFIG[log.event_type] || {
                label: log.event_type,
                icon: Clock,
                color: '#6B7280',
              };
              const Icon = eventConfig.icon;
              const isExpanded = expandedLog === log.id;

              return (
                <div key={log.id}>
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className={cn(
                      'w-full px-4 py-3 flex items-center gap-4 text-left',
                      'hover:bg-[var(--bb-color-bg-elevated)]'
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
                        {log.duration_ms && (
                          <span className="text-[var(--bb-color-text-secondary)]">
                            {log.duration_ms}ms
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Error indicator */}
                    {log.error_message && (
                      <span className="px-2 py-0.5 rounded text-xs bg-[rgba(239,68,68,0.1)] text-[#EF4444]">
                        Error
                      </span>
                    )}

                    {/* Expand indicator */}
                    <ChevronRight
                      size={16}
                      className={cn(
                        'text-[var(--bb-color-text-tertiary)] transition-transform',
                        isExpanded && 'rotate-90'
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
                        {log.action_type && (
                          <div>
                            <div className="text-xs text-[var(--bb-color-text-tertiary)] mb-1">
                              Action Type
                            </div>
                            <div className="text-[var(--bb-color-text-secondary)]">
                              {log.action_type}
                            </div>
                          </div>
                        )}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
