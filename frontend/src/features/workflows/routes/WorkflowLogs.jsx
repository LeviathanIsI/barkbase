/**
 * WorkflowLogs - Dedicated logs page for workflow execution history
 * URL: /workflows/:workflowId/logs
 * HubSpot-style layout with breadcrumb, summary bar, and tabs
 */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Edit3,
  AlertCircle,
  MoreHorizontal,
  Play,
  Pause,
  Download,
  Users,
  Filter,
  X,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  GitBranch,
  LogOut,
  Target,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/cn';

import Button from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import LoadingState from '@/components/ui/LoadingState';

import {
  useWorkflow,
  useWorkflowHistory,
  useWorkflowExecutions,
  useActivateWorkflow,
  usePauseWorkflow,
} from '../hooks';
import { WORKFLOW_STATUS_CONFIG, OBJECT_TYPE_CONFIG } from '../constants';

// Event type configuration with icons and colors
const EVENT_TYPE_CONFIG = {
  enrolled: { label: 'Enrolled', icon: Users, color: '#3B82F6', dotColor: 'bg-blue-500' },
  step_started: { label: 'Step Started', icon: Clock, color: '#F59E0B', dotColor: 'bg-yellow-500' },
  step_completed: { label: 'Step Completed', icon: CheckCircle, color: '#10B981', dotColor: 'bg-green-500' },
  step_failed: { label: 'Step Failed', icon: XCircle, color: '#EF4444', dotColor: 'bg-red-500' },
  step_skipped: { label: 'Step Skipped', icon: Info, color: '#6B7280', dotColor: 'bg-gray-500' },
  unenrolled: { label: 'Unenrolled', icon: LogOut, color: '#6B7280', dotColor: 'bg-gray-500' },
  goal_met: { label: 'Goal Met', icon: Target, color: '#8B5CF6', dotColor: 'bg-purple-500' },
  completed: { label: 'Completed', icon: CheckCircle, color: '#10B981', dotColor: 'bg-green-500' },
  failed: { label: 'Failed', icon: XCircle, color: '#EF4444', dotColor: 'bg-red-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: '#6B7280', dotColor: 'bg-gray-500' },
  branch_taken: { label: 'Branch Taken', icon: GitBranch, color: '#06B6D4', dotColor: 'bg-cyan-500' },
  waiting: { label: 'Waiting', icon: Clock, color: '#F59E0B', dotColor: 'bg-yellow-500' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'step_completed', label: 'Step Completed' },
  { value: 'step_failed', label: 'Step Failed' },
  { value: 'branch_taken', label: 'Branch Taken' },
  { value: 'unenrolled', label: 'Unenrolled' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'All action types' },
  { value: 'send_sms', label: 'Send SMS' },
  { value: 'send_email', label: 'Send Email' },
  { value: 'create_task', label: 'Create Task' },
  { value: 'update_field', label: 'Update Field' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'add_to_segment', label: 'Add to Segment' },
  { value: 'remove_from_segment', label: 'Remove from Segment' },
];

export default function WorkflowLogs() {
  const { id: workflowId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('logs');

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Queries
  const { data: workflowData, isLoading: isLoadingWorkflow } = useWorkflow(workflowId);
  const { data: executionsData } = useWorkflowExecutions(workflowId, { limit: 1 });
  const { data: historyData, isLoading: isLoadingHistory } = useWorkflowHistory(workflowId, {
    eventType: eventTypeFilter || undefined,
    actionType: actionTypeFilter || undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
  });

  // Mutations
  const activateMutation = useActivateWorkflow();
  const pauseMutation = usePauseWorkflow();

  const workflow = workflowData?.data || workflowData;
  const logs = historyData?.data?.logs || historyData?.logs || [];
  const total = historyData?.data?.total || historyData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);
  const totalEnrolled = executionsData?.total || workflow?.enrolled_count || 0;

  // Handlers
  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync(workflowId);
      toast.success('Workflow activated');
    } catch {
      toast.error('Failed to activate workflow');
    }
  };

  const handlePause = async () => {
    try {
      await pauseMutation.mutateAsync(workflowId);
      toast.success('Workflow paused');
    } catch {
      toast.error('Failed to pause workflow');
    }
  };

  const handleFilterChange = (field, value) => {
    if (field === 'eventType') setEventTypeFilter(value);
    else if (field === 'actionType') setActionTypeFilter(value);
    else if (field === 'startDate') setDateRange((prev) => ({ ...prev, start: value }));
    else if (field === 'endDate') setDateRange((prev) => ({ ...prev, end: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setEventTypeFilter('');
    setActionTypeFilter('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  const hasFilters = eventTypeFilter || actionTypeFilter || dateRange.start || dateRange.end;

  // Loading state
  if (isLoadingWorkflow) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bb-color-bg-body)]">
        <LoadingState label="Loading workflow..." />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bb-color-bg-body)]">
        <div className="text-[var(--bb-color-text-tertiary)]">Workflow not found</div>
      </div>
    );
  }

  const statusConfig = WORKFLOW_STATUS_CONFIG[workflow.status] || WORKFLOW_STATUS_CONFIG.draft;
  const objectConfig = OBJECT_TYPE_CONFIG[workflow.object_type] || {};
  const isActive = workflow.status === 'active';

  return (
    <div className="h-screen flex flex-col bg-[var(--bb-color-bg-body)]">
      {/* Breadcrumb Header */}
      <div className="border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-surface)]">
        <div className="px-6 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[var(--bb-color-text-tertiary)] mb-3">
            <Link to="/workflows" className="hover:text-[var(--bb-color-text-primary)]">
              Workflows
            </Link>
            <ChevronRight size={14} />
            <Link to={`/workflows/${workflowId}`} className="hover:text-[var(--bb-color-text-primary)]">
              {workflow.name}
            </Link>
            <ChevronRight size={14} />
            <span className="text-[var(--bb-color-text-primary)]">Logs</span>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/workflows')}
                className={cn(
                  'p-2 rounded',
                  'text-[var(--bb-color-text-secondary)]',
                  'hover:bg-[var(--bb-color-bg-elevated)]'
                )}
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-[var(--bb-color-text-primary)]">
                    {workflow.name}
                  </h1>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.color,
                    }}
                  >
                    Workflow is {isActive ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/workflows/${workflowId}`)}
                leftIcon={<Edit3 size={16} />}
              >
                Edit workflow
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<AlertCircle size={16} />}
              >
                Review issues
              </Button>
              {isActive ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePause}
                  loading={pauseMutation.isPending}
                  leftIcon={<Pause size={16} />}
                >
                  Pause
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleActivate}
                  loading={activateMutation.isPending}
                  leftIcon={<Play size={16} />}
                >
                  Turn on
                </Button>
              )}
              <Button variant="ghost" size="sm" className="px-2">
                <MoreHorizontal size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="px-6 py-3 border-t border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]">
          <div className="flex items-center gap-8 text-sm">
            <SummaryItem label="OBJECT TYPE" value={objectConfig.label || workflow.object_type} />
            <SummaryItem label="TRIGGER" value={getTriggerLabel(workflow.entry_condition)} />
            <SummaryItem label="ENROLLED TOTAL" value={totalEnrolled.toLocaleString()} />
            <SummaryItem
              label="UPDATED ON"
              value={formatDate(workflow.updated_at)}
            />
            <SummaryItem label="UPDATED BY" value={workflow.updated_by_name || '-'} />
            <SummaryItem
              label="CREATED ON"
              value={formatDate(workflow.created_at)}
            />
            <SummaryItem label="CREATED BY" value={workflow.created_by_name || '-'} />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="logs">Action logs</TabsTrigger>
              <TabsTrigger value="enrollment">Enrollment history</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'performance' && (
          <div className="text-center py-12 text-[var(--bb-color-text-tertiary)]">
            Performance metrics coming soon
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filters Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Date Range */}
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-[var(--bb-color-text-tertiary)]" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
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
                  className={cn(
                    'px-3 py-2 rounded-md text-sm',
                    'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                    'text-[var(--bb-color-text-primary)]',
                    'focus:outline-none focus:border-[var(--bb-color-accent)]'
                  )}
                />
              </div>

              {/* Event Type */}
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

              {/* Action Type */}
              <select
                value={actionTypeFilter}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                className={cn(
                  'px-3 py-2 rounded-md text-sm',
                  'bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]',
                  'text-[var(--bb-color-text-primary)]',
                  'focus:outline-none focus:border-[var(--bb-color-accent)]'
                )}
              >
                {ACTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-sm',
                    'text-[var(--bb-color-accent)] hover:bg-[var(--bb-color-bg-surface)]'
                  )}
                >
                  <X size={14} />
                  Reset filters
                </button>
              )}

              {/* Right side actions */}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="secondary" size="sm" leftIcon={<Users size={14} />}>
                  Choose record
                </Button>
                <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>
                  Export
                </Button>
              </div>
            </div>

            {/* Results count */}
            <div className="text-sm text-[var(--bb-color-text-tertiary)]">
              {total.toLocaleString()} log{total !== 1 ? 's' : ''}
            </div>

            {/* Logs Table */}
            <div className="bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)] overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_120px_200px_250px_150px] gap-4 px-4 py-3 border-b border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-elevated)]">
                <div className="text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                  Record
                </div>
                <div className="text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                  Diagnose
                </div>
                <div className="text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                  Action
                </div>
                <div className="text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                  Event
                </div>
                <div className="text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase">
                  Time
                </div>
              </div>

              {/* Table Body */}
              {isLoadingHistory ? (
                <div className="p-8">
                  <LoadingState label="Loading action logs..." />
                </div>
              ) : logs.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-[var(--bb-color-text-tertiary)]">
                  {hasFilters ? 'No logs match the current filters' : 'No action logs yet'}
                </div>
              ) : (
                <div className="divide-y divide-[var(--bb-color-border-subtle)]">
                  {logs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                    />
                  ))}
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
        )}

        {activeTab === 'enrollment' && (
          <div className="text-center py-12 text-[var(--bb-color-text-tertiary)]">
            Enrollment history coming soon
          </div>
        )}
      </div>
    </div>
  );
}

// Summary item component
function SummaryItem({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-[var(--bb-color-text-tertiary)] uppercase mb-0.5">
        {label}
      </div>
      <div className="text-sm text-[var(--bb-color-text-primary)]">{value}</div>
    </div>
  );
}

// Log row component - no expandable functionality
function LogRow({ log }) {
  const eventConfig = EVENT_TYPE_CONFIG[log.event_type] || {
    label: log.event_type,
    icon: Clock,
    color: '#6B7280',
    dotColor: 'bg-gray-500',
  };

  return (
    <div
      className={cn(
        'w-full grid grid-cols-[1fr_120px_200px_250px_150px] gap-4 px-4 py-3 text-left',
        'hover:bg-[var(--bb-color-bg-elevated)]'
      )}
    >
      {/* Record */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-[var(--bb-color-accent)] truncate">
          {log.record_name || log.record_id}
        </span>
      </div>

      {/* Diagnose */}
      <div>
        <button
          onClick={() => {
            // TODO: Show enrollment reason modal
          }}
          className={cn(
            'text-xs px-2 py-1 rounded',
            'text-[var(--bb-color-accent)]',
            'hover:bg-[var(--bb-color-bg-body)]'
          )}
        >
          Why enrolled?
        </button>
      </div>

      {/* Action */}
      <div className="min-w-0">
        <div className="text-sm text-[var(--bb-color-text-primary)] truncate">
          {log.step_name || '-'}
        </div>
        {log.action_type && (
          <div className="text-xs text-[var(--bb-color-text-tertiary)]">
            {formatActionType(log.action_type)}
          </div>
        )}
      </div>

      {/* Event */}
      <div className="flex items-center gap-2 min-w-0">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', eventConfig.dotColor)} />
        <div className="min-w-0">
          <div className="text-sm text-[var(--bb-color-text-primary)]">
            {eventConfig.label}
          </div>
          {log.error_message && (
            <div className="text-xs text-[var(--bb-color-status-negative)] truncate">
              {log.error_message}
            </div>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="text-sm text-[var(--bb-color-text-secondary)]">
        {formatDateTime(log.created_at || log.started_at)}
      </div>
    </div>
  );
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
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

function formatActionType(actionType) {
  const labels = {
    send_sms: 'Send SMS',
    send_email: 'Send Email',
    create_task: 'Create Task',
    update_field: 'Update Field',
    webhook: 'Webhook',
    add_to_segment: 'Add to Segment',
    remove_from_segment: 'Remove from Segment',
    enroll_in_workflow: 'Enroll in Workflow',
    unenroll_from_workflow: 'Unenroll from Workflow',
  };
  return labels[actionType] || actionType;
}

function getTriggerLabel(entryCondition) {
  if (!entryCondition) return '-';
  const triggerType = entryCondition.trigger_type || entryCondition.triggerType;
  const labels = {
    event: 'Event',
    filter_criteria: 'Filter',
    schedule: 'Schedule',
    manual: 'Manual',
  };
  return labels[triggerType] || triggerType || '-';
}
