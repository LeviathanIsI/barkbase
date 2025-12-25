/**
 * ActionLogsTab - Execution logs tab for workflow details
 * Shows detailed action logs in a table format enterprise-grade
 */
import { useState } from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';
import LoadingState from '@/components/ui/LoadingState';
import { useWorkflowHistory } from '../../hooks';

const EVENT_TYPE_CONFIG = {
  enrolled: { label: 'Enrolled', color: '#3B82F6' },
  step_started: { label: 'Step Started', color: '#F59E0B' },
  step_completed: { label: 'Completed', color: '#10B981' },
  step_failed: { label: 'Failed', color: '#EF4444' },
  step_skipped: { label: 'Skipped', color: '#6B7280' },
  unenrolled: { label: 'Unenrolled', color: '#6B7280' },
  goal_reached: { label: 'Goal Reached', color: '#8B5CF6' },
  goal_met: { label: 'Goal Met', color: '#8B5CF6' },
  completed: { label: 'Completed', color: '#10B981' },
  failed: { label: 'Failed', color: '#EF4444' },
  cancelled: { label: 'Cancelled', color: '#6B7280' },
  pending: { label: 'Pending', color: '#F59E0B' },
};

const ACTION_TYPE_LABELS = {
  send_email: 'Send email',
  send_sms: 'Send SMS',
  create_task: 'Create task',
  update_property: 'Update property',
  add_tag: 'Add tag',
  remove_tag: 'Remove tag',
  webhook: 'Trigger webhook',
  delay: 'Delay',
  enroll_in_workflow: 'Enroll in workflow',
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

      {/* Logs Table */}
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--bb-color-border-subtle)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--bb-color-text-tertiary)] uppercase tracking-wider">
                  Record
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--bb-color-text-tertiary)] uppercase tracking-wider">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--bb-color-text-tertiary)] uppercase tracking-wider">
                  Event
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--bb-color-text-tertiary)] uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--bb-color-border-subtle)]">
              {logs.map((log) => {
                const eventConfig = EVENT_TYPE_CONFIG[log.event_type] || {
                  label: log.event_type || 'Unknown',
                  color: '#6B7280',
                };
                const actionLabel = ACTION_TYPE_LABELS[log.action_type] || log.action_type || '-';

                return (
                  <tr key={log.id}>
                    {/* Record Name */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[var(--bb-color-text-primary)]">
                        {log.record_name || 'Unknown'}
                      </div>
                      <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                        {log.record_type || 'Record'}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-[var(--bb-color-text-primary)]">
                        {actionLabel}
                      </div>
                      {log.step_name && (
                        <div className="text-xs text-[var(--bb-color-text-tertiary)]">
                          {log.step_name}
                        </div>
                      )}
                    </td>

                    {/* Event */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: eventConfig.color }}
                        />
                        <span className="text-sm text-[var(--bb-color-text-primary)]">
                          {eventConfig.label}
                        </span>
                      </div>
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm text-[var(--bb-color-text-primary)]">
                        {formatDateTime(log.created_at)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
