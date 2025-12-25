/**
 * Workflows Dashboard
 * Main page for viewing and managing all workflows
 * enterprise table view with filters and search
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal from '@/components/ui/Modal';

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
      // Navigate to the cloned workflow
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

  // Loading state
  if (isLoadingWorkflows && !workflowsData) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bb-color-bg-body)]">
        <LoadingState label="Loading workflows..." />
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
      />

      {/* Filter Tabs */}
      <WorkflowsFilterTabs
        activeTab={statusFilter}
        onTabChange={handleStatusFilterChange}
        counts={counts}
      />

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {workflows.length === 0 && !searchQuery && !statusFilter ? (
          // Empty state - no workflows at all
          <div className="h-full flex items-center justify-center p-8">
            <EmptyState
              icon={GitBranch}
              title="Create your first workflow"
              description="Automate repetitive tasks like sending reminders, creating follow-up tasks, and updating records when specific events happen."
              actions={
                <Button
                  variant="primary"
                  onClick={() => navigate('/workflows/new')}
                  leftIcon={<Plus size={16} />}
                >
                  Create workflow
                </Button>
              }
            />
          </div>
        ) : workflows.length === 0 ? (
          // Empty state - no results for search/filter
          <div className="h-full flex items-center justify-center p-8">
            <EmptyState
              icon={GitBranch}
              title="No workflows found"
              description={
                searchQuery
                  ? `No workflows match "${searchQuery}"`
                  : 'No workflows match the selected filters'
              }
              actions={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter(null);
                    setCurrentPage(1);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
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
        message="Are you sure you want to delete this workflow? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Template selection modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="Create from template"
      >
        <div className="p-4">
          {templates.length === 0 ? (
            <p className="text-[var(--bb-color-text-secondary)] text-center py-8">
              No templates available
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleCreateFromTemplate(template.id)}
                  disabled={createFromTemplateMutation.isPending}
                  className="w-full p-4 text-left rounded-lg border border-[var(--bb-color-border-subtle)] hover:border-[var(--bb-color-accent)] hover:bg-[var(--bb-color-bg-surface)] transition-colors"
                >
                  <div className="font-medium text-[var(--bb-color-text-primary)]">
                    {template.name}
                  </div>
                  {template.description && (
                    <div className="text-sm text-[var(--bb-color-text-secondary)] mt-1">
                      {template.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
