/**
 * Workflow Details Page
 * Performance metrics, execution logs, and enrollment history
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  GitBranch,
  Play,
  Pause,
  Edit3,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  BarChart3,
  Activity,
  Calendar,
  Loader2,
  RefreshCw,
  Eye,
  StopCircle,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import StyledSelect from '@/components/ui/StyledSelect';
import {
  getWorkflow,
  getWorkflowExecutions,
  activateWorkflow,
  pauseWorkflow,
  cancelExecution,
} from '../api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Status configuration
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
  active: { label: 'Active', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  paused: { label: 'Paused', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
};

// Execution status configuration
const EXECUTION_STATUS_CONFIG = {
  running: { label: 'Running', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Loader2 },
  paused: { label: 'Paused', color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Pause },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle },
  failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800', icon: StopCircle },
};

// Tabs
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'executions', label: 'Executions' },
  { id: 'history', label: 'History' },
];

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeDate(dateString) {
  if (!dateString) return 'Never';
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
  return formatDate(dateString);
}

// Stat Card
// eslint-disable-next-line no-unused-vars
const StatCard = ({ icon: Icon, label, value, variant = 'primary', subtitle }) => {
  const variantStyles = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
    },
    neutral: {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      iconBg: 'bg-gray-100 dark:bg-gray-900/40',
      icon: 'text-gray-600 dark:text-gray-400',
      border: 'border-gray-200 dark:border-gray-800/50',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div className={cn('relative flex items-center gap-3 rounded-xl border p-4', styles.bg, styles.border)}>
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] leading-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

// Execution Row
const ExecutionRow = ({ execution, onView, onCancel }) => {
  const statusConfig = EXECUTION_STATUS_CONFIG[execution.status] || EXECUTION_STATUS_CONFIG.running;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-[color:var(--bb-color-bg-elevated)] transition-colors"
      style={{ borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className={cn('p-2 rounded-lg', statusConfig.bg)}>
        <StatusIcon className={cn('h-4 w-4', statusConfig.color, execution.status === 'running' && 'animate-spin')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-[color:var(--bb-color-text-primary)]">
            {execution.record_type} #{execution.record_id?.slice(0, 8)}
          </span>
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.bg, statusConfig.color)}>
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[color:var(--bb-color-text-muted)] mt-1">
          <span>Enrolled: {formatRelativeDate(execution.enrolled_at)}</span>
          {execution.completed_at && (
            <span>Completed: {formatRelativeDate(execution.completed_at)}</span>
          )}
        </div>
        {execution.error_message && (
          <p className="text-xs text-red-600 mt-1">{execution.error_message}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onView(execution)}>
          <Eye className="h-4 w-4" />
        </Button>
        {execution.status === 'running' && (
          <Button variant="ghost" size="sm" onClick={() => onCancel(execution.id)}>
            <StopCircle className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Overview Tab
const OverviewTab = ({ workflow, executions }) => {
  const stats = useMemo(() => {
    const running = executions.filter((e) => e.status === 'running').length;
    const completed = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const successRate = executions.length > 0 ? Math.round((completed / executions.length) * 100) : 0;

    return { running, completed, failed, successRate, total: executions.length };
  }, [executions]);

  const entryCondition = workflow?.entry_condition || {};

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Currently Running"
          value={stats.running}
          variant={stats.running > 0 ? 'primary' : 'neutral'}
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          variant="success"
        />
        <StatCard
          icon={XCircle}
          label="Failed"
          value={stats.failed}
          variant={stats.failed > 0 ? 'danger' : 'neutral'}
        />
        <StatCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${stats.successRate}%`}
          variant={stats.successRate >= 80 ? 'success' : stats.successRate >= 50 ? 'warning' : 'danger'}
        />
      </div>

      {/* Workflow Info */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4">Workflow Details</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-[color:var(--bb-color-text-muted)]">Object Type</dt>
              <dd className="font-medium text-[color:var(--bb-color-text-primary)] capitalize">{workflow?.object_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[color:var(--bb-color-text-muted)]">Trigger Type</dt>
              <dd className="font-medium text-[color:var(--bb-color-text-primary)] capitalize">
                {entryCondition.trigger_type?.replace('_', ' ')}
              </dd>
            </div>
            {entryCondition.event_type && (
              <div className="flex justify-between">
                <dt className="text-[color:var(--bb-color-text-muted)]">Event</dt>
                <dd className="font-medium text-[color:var(--bb-color-text-primary)]">
                  {entryCondition.event_type?.replace(/\./g, ' ').replace(/_/g, ' ')}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-[color:var(--bb-color-text-muted)]">Created</dt>
              <dd className="font-medium text-[color:var(--bb-color-text-primary)]">{formatDate(workflow?.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[color:var(--bb-color-text-muted)]">Last Run</dt>
              <dd className="font-medium text-[color:var(--bb-color-text-primary)]">
                {formatRelativeDate(workflow?.last_run_at)}
              </dd>
            </div>
          </dl>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
        >
          <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4">Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[color:var(--bb-color-text-muted)]">Success Rate</span>
                <span className="font-medium text-[color:var(--bb-color-text-primary)]">{stats.successRate}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{ width: `${stats.successRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[color:var(--bb-color-text-muted)]">Total Executions</span>
                <span className="font-medium text-[color:var(--bb-color-text-primary)]">{stats.total}</span>
              </div>
            </div>

            {workflow?.description && (
              <div className="pt-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
                <p className="text-xs text-[color:var(--bb-color-text-muted)] mb-1">Description</p>
                <p className="text-sm text-[color:var(--bb-color-text-primary)]">{workflow.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Executions Tab
const ExecutionsTab = ({ executions, onViewExecution, onCancelExecution, onRefresh, isLoading }) => {
  const [statusFilter, setStatusFilter] = useState('');

  const filteredExecutions = useMemo(() => {
    if (!statusFilter) return executions;
    return executions.filter((e) => e.status === statusFilter);
  }, [executions, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-40">
            <StyledSelect
              options={[
                { value: '', label: 'All Statuses' },
                ...Object.entries(EXECUTION_STATUS_CONFIG).map(([key, cfg]) => ({
                  value: key,
                  label: cfg.label,
                })),
              ]}
              value={statusFilter}
              onChange={(opt) => setStatusFilter(opt?.value || '')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">
            {filteredExecutions.length} execution{filteredExecutions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Executions List */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        {filteredExecutions.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-10 w-10 mx-auto mb-3 text-[color:var(--bb-color-text-muted)]" />
            <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1">
              No executions found
            </p>
            <p className="text-xs text-[color:var(--bb-color-text-muted)]">
              {statusFilter ? 'Try changing your filter' : 'Executions will appear here once the workflow runs'}
            </p>
          </div>
        ) : (
          filteredExecutions.map((execution) => (
            <ExecutionRow
              key={execution.id}
              execution={execution}
              onView={onViewExecution}
              onCancel={onCancelExecution}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Main Component
export default function WorkflowDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workflow, setWorkflow] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const [workflowResponse, executionsResponse] = await Promise.all([
        getWorkflow(id),
        getWorkflowExecutions(id),
      ]);

      setWorkflow(workflowResponse.data);
      setExecutions(executionsResponse.data?.executions || executionsResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.message || 'Failed to load workflow');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Activate workflow
  const handleActivate = useCallback(async () => {
    try {
      setIsUpdatingStatus(true);
      await activateWorkflow(id);
      setWorkflow((prev) => ({ ...prev, status: 'active' }));
      toast.success('Workflow activated');
    } catch (err) {
      console.error('Failed to activate workflow:', err);
      toast.error('Failed to activate workflow');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [id]);

  // Pause workflow
  const handlePause = useCallback(async () => {
    try {
      setIsUpdatingStatus(true);
      await pauseWorkflow(id);
      setWorkflow((prev) => ({ ...prev, status: 'paused' }));
      toast.success('Workflow paused');
    } catch (err) {
      console.error('Failed to pause workflow:', err);
      toast.error('Failed to pause workflow');
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [id]);

  // Cancel execution
  const handleCancelExecution = useCallback(async (executionId) => {
    if (!confirm('Are you sure you want to cancel this execution?')) return;

    try {
      await cancelExecution(id, executionId);
      toast.success('Execution cancelled');
      fetchData(false);
    } catch (err) {
      console.error('Failed to cancel execution:', err);
      toast.error('Failed to cancel execution');
    }
  }, [id, fetchData]);

  // View execution
  // eslint-disable-next-line no-unused-vars
  const handleViewExecution = useCallback((_execution) => {
    toast.info('Execution details coming soon');
  }, []);

  const statusConfig = STATUS_CONFIG[workflow?.status] || STATUS_CONFIG.draft;

  if (loading) {
    return <LoadingState label="Loading workflow..." variant="mascot" />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)]">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-lg font-medium text-[color:var(--bb-color-text-primary)] mb-2">Error Loading Workflow</h2>
        <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">{error}</p>
        <Button onClick={() => navigate('/workflows')}>Back to Workflows</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <nav className="mb-1">
              <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
                <li>
                  <Link to="/workflows" className="hover:text-[color:var(--bb-color-accent)]">
                    Workflows
                  </Link>
                </li>
                <li>
                  <ChevronRight className="h-3 w-3" />
                </li>
                <li className="text-[color:var(--bb-color-text-primary)] font-medium truncate max-w-[200px]">
                  {workflow?.name || 'Untitled'}
                </li>
              </ol>
            </nav>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                {workflow?.name || 'Untitled Workflow'}
              </h1>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', statusConfig.bg, statusConfig.color)}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to={`/workflows/${id}`}>
            <Button variant="ghost" size="sm">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>

          {workflow?.status === 'active' ? (
            <Button variant="secondary" size="sm" onClick={handlePause} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
              Pause
            </Button>
          ) : (
            <Button onClick={handleActivate} disabled={isUpdatingStatus}>
              {isUpdatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Publish
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b shrink-0 mb-4" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-[color:var(--bb-color-accent)] border-[color:var(--bb-color-accent)]'
                : 'text-[color:var(--bb-color-text-muted)] border-transparent hover:text-[color:var(--bb-color-text-primary)]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'overview' && (
          <OverviewTab workflow={workflow} executions={executions} />
        )}
        {activeTab === 'executions' && (
          <ExecutionsTab
            executions={executions}
            onViewExecution={handleViewExecution}
            onCancelExecution={handleCancelExecution}
            onRefresh={() => fetchData(false)}
            isLoading={refreshing}
          />
        )}
        {activeTab === 'history' && (
          <div className="p-8 text-center">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-[color:var(--bb-color-text-muted)]" />
            <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-1">
              History coming soon
            </p>
            <p className="text-xs text-[color:var(--bb-color-text-muted)]">
              View enrollment history and workflow changes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
