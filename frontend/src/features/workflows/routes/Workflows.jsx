/**
 * Workflows Dashboard
 * Main page for viewing and managing all workflows
 * Enterprise table view with filters and search
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  Zap,
  Play,
  Clock,
  AlertTriangle,
  Mail,
  Bell,
  CheckSquare,
  Calendar,
  PawPrint,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Activity,
  XCircle,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/cn';

import {
  useWorkflows,
  useWorkflowStats,
  useWorkflowTemplates,
  useCreateFromTemplate,
  useActivateWorkflow,
  usePauseWorkflow,
  useCloneWorkflow,
  useDeleteWorkflow,
} from '../hooks';

import WorkflowsHeader from '../components/WorkflowsHeader';
import WorkflowsFilterTabs from '../components/WorkflowsFilterTabs';
import WorkflowsTable from '../components/WorkflowsTable';

const PAGE_SIZE = 25;

// Example workflow templates to show in empty state
const EXAMPLE_WORKFLOWS = [
  {
    id: 'vaccination-reminder',
    icon: PawPrint,
    title: 'Vaccination Reminders',
    description: 'Send automated reminders when pet vaccinations are expiring',
    color: '#10B981',
    trigger: 'When vaccination expires in 14 days',
    actions: ['Send email', 'Create task'],
  },
  {
    id: 'booking-confirmation',
    icon: Calendar,
    title: 'Booking Confirmations',
    description: 'Automatically confirm bookings and notify owners',
    color: '#3B82F6',
    trigger: 'When booking is created',
    actions: ['Send SMS', 'Send email'],
  },
  {
    id: 'follow-up-tasks',
    icon: CheckSquare,
    title: 'Follow-up Tasks',
    description: 'Create staff tasks after check-out for follow-up calls',
    color: '#F59E0B',
    trigger: 'When pet is checked out',
    actions: ['Create task', 'Add to segment'],
  },
  {
    id: 'payment-reminders',
    icon: Bell,
    title: 'Payment Reminders',
    description: 'Send gentle reminders for overdue invoices',
    color: '#8B5CF6',
    trigger: 'When invoice is overdue',
    actions: ['Send SMS', 'Send email'],
  },
];

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, variant = 'default', subtext }) => {
  const variants = {
    default: {
      bg: 'bg-[color:var(--bb-color-bg-surface)]',
      iconBg: 'bg-[color:var(--bb-color-accent-soft)]',
      iconColor: 'text-[color:var(--bb-color-accent)]',
      border: 'border-[color:var(--bb-color-border-subtle)]',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
    },
  };

  const styles = variants[variant] || variants.default;

  return (
    <div className={cn('flex items-center gap-3 rounded-xl border p-4', styles.bg, styles.border)}>
      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.iconColor)} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        <p className="text-xl font-bold text-[color:var(--bb-color-text-primary)]">{value}</p>
        {subtext && (
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">{subtext}</p>
        )}
      </div>
    </div>
  );
};

// Animated Workflow Icon
const AnimatedWorkflowIcon = () => (
  <div className="relative w-24 h-24 mx-auto mb-6">
    {/* Background glow */}
    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[color:var(--bb-color-accent)]/20 to-purple-500/20 blur-xl animate-pulse" />

    {/* Outer ring */}
    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[color:var(--bb-color-accent)]/30 animate-[spin_20s_linear_infinite]" />

    {/* Inner circle */}
    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[color:var(--bb-color-accent)] to-purple-600 flex items-center justify-center shadow-lg shadow-[color:var(--bb-color-accent)]/30">
      <Zap className="h-10 w-10 text-white" />
    </div>

    {/* Floating nodes */}
    <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-emerald-500 shadow-lg animate-bounce" style={{ animationDelay: '0ms' }} />
    <div className="absolute top-1/2 -right-1 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-500 shadow-lg animate-bounce" style={{ animationDelay: '150ms' }} />
    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-amber-500 shadow-lg animate-bounce" style={{ animationDelay: '300ms' }} />
    <div className="absolute top-1/2 -left-1 -translate-y-1/2 h-3 w-3 rounded-full bg-purple-500 shadow-lg animate-bounce" style={{ animationDelay: '450ms' }} />
  </div>
);

// Example Workflow Card (for empty state)
const ExampleWorkflowCard = ({ workflow, onClick }) => {
  const Icon = workflow.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative text-left p-4 rounded-xl border transition-all duration-200',
        'bg-[color:var(--bb-color-bg-surface)] border-[color:var(--bb-color-border-subtle)]',
        'hover:border-[color:var(--bb-color-accent)] hover:shadow-lg hover:-translate-y-0.5'
      )}
    >
      {/* Icon */}
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: `${workflow.color}20` }}
      >
        <Icon className="h-5 w-5" style={{ color: workflow.color }} />
      </div>

      {/* Title & Description */}
      <h4 className="font-semibold text-[color:var(--bb-color-text-primary)] mb-1 group-hover:text-[color:var(--bb-color-accent)]">
        {workflow.title}
      </h4>
      <p className="text-xs text-[color:var(--bb-color-text-muted)] mb-3 line-clamp-2">
        {workflow.description}
      </p>

      {/* Trigger & Actions */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-[color:var(--bb-color-text-secondary)]">
          <Play className="h-3 w-3 text-emerald-500" />
          <span className="truncate">{workflow.trigger}</span>
        </div>
        <div className="flex items-center gap-2 text-[color:var(--bb-color-text-muted)]">
          <ArrowRight className="h-3 w-3" />
          <span>{workflow.actions.join(' → ')}</span>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
      </div>
    </button>
  );
};

// Template Modal Content
const TemplateModalContent = ({ templates, onSelect, isLoading }) => {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-[color:var(--bb-color-bg-elevated)] flex items-center justify-center">
          <Sparkles className="h-8 w-8 text-[color:var(--bb-color-text-muted)]" />
        </div>
        <p className="text-[color:var(--bb-color-text-secondary)] mb-1">No templates available</p>
        <p className="text-sm text-[color:var(--bb-color-text-muted)]">
          Templates will appear here as they become available
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onSelect(template.id)}
          disabled={isLoading}
          className={cn(
            'p-4 text-left rounded-xl border transition-all',
            'bg-[color:var(--bb-color-bg-surface)] border-[color:var(--bb-color-border-subtle)]',
            'hover:border-[color:var(--bb-color-accent)] hover:shadow-md',
            isLoading && 'opacity-50 cursor-wait'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[color:var(--bb-color-accent)] to-purple-600 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-[color:var(--bb-color-text-primary)]">
                {template.name}
              </div>
              {template.description && (
                <div className="text-sm text-[color:var(--bb-color-text-muted)] mt-1 line-clamp-2">
                  {template.description}
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default function Workflows() {
  const navigate = useNavigate();

  // State
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Queries
  const { data: workflowsData, isLoading: isLoadingWorkflows } = useWorkflows({
    status: statusFilter,
    search: searchQuery || undefined,
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  });

  const { data: statsData } = useWorkflowStats();
  const { data: templatesData } = useWorkflowTemplates();

  // Mutations
  const createFromTemplateMutation = useCreateFromTemplate();
  const activateMutation = useActivateWorkflow();
  const pauseMutation = usePauseWorkflow();
  const cloneMutation = useCloneWorkflow();
  const deleteMutation = useDeleteWorkflow();

  // Derived data
  const workflows = workflowsData?.data?.workflows || [];
  const totalCount = workflowsData?.data?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const stats = statsData?.data || {};
  const counts = {
    total: stats.total || 0,
    active: stats.active || 0,
    paused: stats.paused || 0,
    draft: stats.draft || 0,
  };
  const templates = templatesData?.data?.templates || [];

  // Calculate additional stats
  const runStats = useMemo(() => {
    return {
      runToday: stats.runToday || stats.run_today || 0,
      failed: stats.failed || stats.failedLast7Days || stats.failed_last_7_days || 0,
    };
  }, [stats]);

  const hasWorkflows = counts.total > 0;

  // Handlers
  const handleActivate = async (workflowId) => {
    try {
      await activateMutation.mutateAsync(workflowId);
      toast.success('Workflow activated');
    } catch {
      toast.error('Failed to activate workflow');
    }
  };

  const handlePause = async (workflowId) => {
    try {
      await pauseMutation.mutateAsync(workflowId);
      toast.success('Workflow paused');
    } catch {
      toast.error('Failed to pause workflow');
    }
  };

  const handleClone = async (workflowId) => {
    try {
      const result = await cloneMutation.mutateAsync(workflowId);
      toast.success('Workflow cloned');
      if (result?.data?.workflow?.id) {
        navigate(`/workflows/${result.data.workflow.id}`);
      }
    } catch {
      toast.error('Failed to clone workflow');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirm);
      toast.success('Workflow deleted');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete workflow');
    }
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleCreateFromTemplate = async (templateId) => {
    try {
      const result = await createFromTemplateMutation.mutateAsync({
        templateId,
        data: {},
      });
      setShowTemplateModal(false);
      toast.success('Workflow created from template');
      if (result?.data?.workflow?.id) {
        navigate(`/workflows/${result.data.workflow.id}`);
      }
    } catch {
      toast.error('Failed to create workflow from template');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
    setCurrentPage(1);
  };

  // Loading state
  if (isLoadingWorkflows && !workflowsData) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bb-color-bg-body)]">
        <LoadingState label="Loading workflows..." variant="mascot" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bb-color-bg-body)]">
      {/* Header */}
      <WorkflowsHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onCreateFromTemplate={() => setShowTemplateModal(true)}
        hasWorkflows={hasWorkflows}
      />

      {/* Stats Bar - Only show when workflows exist */}
      {hasWorkflows && (
        <div className="px-6 py-4 border-b border-[color:var(--bb-color-border-subtle)]">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={GitBranch}
              label="Total Workflows"
              value={counts.total}
            />
            <StatCard
              icon={Activity}
              label="Active"
              value={counts.active}
              variant="success"
              subtext={counts.active > 0 ? 'Running automations' : undefined}
            />
            <StatCard
              icon={TrendingUp}
              label="Executed Today"
              value={runStats.runToday}
              variant={runStats.runToday > 0 ? 'default' : undefined}
            />
            <StatCard
              icon={XCircle}
              label="Failed (7d)"
              value={runStats.failed}
              variant={runStats.failed > 0 ? 'danger' : 'default'}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <WorkflowsFilterTabs
        activeTab={statusFilter}
        onTabChange={handleStatusFilterChange}
        counts={counts}
        hasWorkflows={hasWorkflows}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {workflows.length === 0 && !searchQuery && !statusFilter ? (
          // Enhanced empty state - no workflows at all
          <div className="h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto px-6 py-12">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <AnimatedWorkflowIcon />

                <h2 className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] mb-3">
                  Automate your operations
                </h2>
                <p className="text-[color:var(--bb-color-text-secondary)] max-w-lg mx-auto mb-6">
                  Create workflows to automatically send reminders, create tasks, update records,
                  and more when specific events happen.
                </p>

                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/workflows/new')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create from scratch
                  </Button>
                  {templates.length > 0 && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => setShowTemplateModal(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Use a template
                    </Button>
                  )}
                </div>
              </div>

              {/* Example Workflows Section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)]">
                    Popular automation ideas
                  </h3>
                  <span className="text-xs text-[color:var(--bb-color-text-muted)]">
                    Click to create
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {EXAMPLE_WORKFLOWS.map((workflow) => (
                    <ExampleWorkflowCard
                      key={workflow.id}
                      workflow={workflow}
                      onClick={() => navigate('/workflows/new')}
                    />
                  ))}
                </div>
              </div>

              {/* Features List */}
              <div className="rounded-xl border border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)] p-6">
                <h3 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] mb-4">
                  What can workflows do?
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: Mail, label: 'Send automated emails', desc: 'Confirmations, reminders, follow-ups' },
                    { icon: Bell, label: 'Send SMS notifications', desc: 'Text updates to owners' },
                    { icon: CheckSquare, label: 'Create tasks', desc: 'Assign follow-up work to staff' },
                    { icon: Clock, label: 'Schedule actions', desc: 'Wait for the right time' },
                    { icon: GitBranch, label: 'Branch on conditions', desc: 'If/then logic paths' },
                    { icon: Zap, label: 'Trigger on events', desc: 'Bookings, check-ins, payments' },
                  ].map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[color:var(--bb-color-bg-elevated)] flex items-center justify-center flex-shrink-0">
                        <feature.icon className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">
                          {feature.label}
                        </p>
                        <p className="text-xs text-[color:var(--bb-color-text-muted)]">
                          {feature.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : workflows.length === 0 ? (
          // Empty state - no results for search/filter
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-[color:var(--bb-color-bg-surface)] flex items-center justify-center">
                <GitBranch className="h-8 w-8 text-[color:var(--bb-color-text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">
                No workflows found
              </h3>
              <p className="text-[color:var(--bb-color-text-muted)] mb-4">
                {searchQuery
                  ? `No workflows match "${searchQuery}"`
                  : 'No workflows match the selected filter'}
              </p>
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </div>
        ) : (
          // Workflows table
          <WorkflowsTable
            workflows={workflows}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            totalPages={totalPages}
            pageSize={PAGE_SIZE}
            onActivate={handleActivate}
            onPause={handlePause}
            onClone={handleClone}
            onDelete={(workflowId) => setDeleteConfirm(workflowId)}
          />
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete workflow"
        message="Are you sure you want to delete this workflow? This action cannot be undone. Any active enrollments will be cancelled."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Template selection modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTemplateModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl mx-4 bg-[color:var(--bb-color-bg-elevated)] rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--bb-color-border-subtle)]">
              <div>
                <h2 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
                  Start from a template
                </h2>
                <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                  Choose a pre-built workflow to customize
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 rounded-lg hover:bg-[color:var(--bb-color-bg-surface)] transition-colors"
              >
                <XCircle className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <TemplateModalContent
                templates={templates}
                onSelect={handleCreateFromTemplate}
                isLoading={createFromTemplateMutation.isPending}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[color:var(--bb-color-border-subtle)] bg-[color:var(--bb-color-bg-surface)]">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  navigate('/workflows/new');
                }}
                className="text-sm text-[color:var(--bb-color-accent)] hover:underline"
              >
                Or start from scratch →
              </button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
