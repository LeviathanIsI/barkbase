/**
 * ReviewWorkflowSidebar - Pre-activation checklist sidebar
 * Shows 4 collapsible steps to review before activating a workflow
 */
import Button from '@/components/ui/Button';
import apiClient from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  GitBranch,
  ListChecks,
  Loader2,
  Settings,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ENTRY_CONDITION_TYPES, OBJECT_TYPE_CONFIG } from '../../constants';

/**
 * Collapsible section component
 */
function ChecklistSection({ title, icon, status, children, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const statusIcon = {
    complete: <CheckCircle className="w-4 h-4 text-[#10B981]" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />,
    error: <AlertCircle className="w-4 h-4 text-[#EF4444]" />,
    loading: <Loader2 className="w-4 h-4 text-[var(--bb-color-text-tertiary)] animate-spin" />
  };

  return (
    <div className="border border-[var(--bb-color-border-subtle)] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 p-3',
          'bg-[var(--bb-color-bg-surface)] hover:bg-[var(--bb-color-bg-elevated)]',
          'transition-colors text-left'
        )}
      >
        {icon}
        <span className="flex-1 text-sm font-medium text-[var(--bb-color-text-primary)]">
          {title}
        </span>
        {statusIcon[status]}
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-[var(--bb-color-text-tertiary)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--bb-color-text-tertiary)]" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 border-t border-[var(--bb-color-border-subtle)] bg-[var(--bb-color-bg-base)]">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Validate trigger configuration
 */
function validateTrigger(workflow) {
  const issues = [];

  if (!workflow.entryCondition?.triggerType) {
    issues.push({ type: 'error', message: 'No enrollment trigger configured' });
    return { status: 'error', issues };
  }

  const triggerType = workflow.entryCondition.triggerType;

  if (triggerType === 'filter_criteria') {
    const filterConfig = workflow.entryCondition.filterConfig;
    if (!filterConfig || !filterConfig.groups || filterConfig.groups.length === 0) {
      issues.push({ type: 'error', message: 'No filter conditions defined' });
    } else {
      const hasConditions = filterConfig.groups.some(g => g.conditions && g.conditions.length > 0);
      if (!hasConditions) {
        issues.push({ type: 'error', message: 'Filter groups have no conditions' });
      }
    }
  }

  if (triggerType === 'event' && !workflow.entryCondition.eventType) {
    issues.push({ type: 'error', message: 'No event type selected' });
  }

  if (triggerType === 'schedule' && !workflow.entryCondition.scheduleConfig) {
    issues.push({ type: 'error', message: 'No schedule defined' });
  }

  if (issues.some(i => i.type === 'error')) {
    return { status: 'error', issues };
  }

  return { status: 'complete', issues };
}

/**
 * Validate steps configuration
 */
function validateSteps(steps) {
  const issues = [];

  if (!steps || steps.length === 0) {
    issues.push({ type: 'warning', message: 'No steps defined - only enrollment will be tracked' });
    return { status: 'warning', issues };
  }

  steps.forEach((step) => {
    const config = step.config || step.actionConfig || step.action_config || {};

    // Debug logging to identify validation issues

    if (step.actionType === 'send_sms' || step.action_type === 'send_sms') {
      if (!config.message) {
        issues.push({ type: 'error', message: `SMS action "${step.name}" has no message` });
      }
    }

    if (step.actionType === 'send_email' || step.action_type === 'send_email') {
      if (!config.subject) {
        issues.push({ type: 'error', message: `Email action "${step.name}" has no subject` });
      }
    }

    if (step.actionType === 'create_task' || step.action_type === 'create_task') {
      if (!config.title) {
        issues.push({ type: 'error', message: `Task action "${step.name}" has no title` });
      }
    }

    if (step.actionType === 'update_field' || step.action_type === 'update_field') {
      if (!config.property && !config.field) {
        issues.push({ type: 'error', message: `Update field "${step.name}" has no property selected` });
      }
    }

    if (step.actionType === 'webhook' || step.action_type === 'webhook') {
      if (!config.url) {
        issues.push({ type: 'error', message: `Webhook "${step.name}" has no URL` });
      }
    }

    if (step.stepType === 'wait' || step.step_type === 'wait') {
      const waitConfig = step.waitConfig || step.wait_config || {};
      if (!waitConfig.waitType && !waitConfig.wait_type && !waitConfig.duration) {
        issues.push({ type: 'error', message: `Wait step "${step.name}" is not configured` });
      }
    }

    if (step.stepType === 'determinator' || step.step_type === 'determinator') {
      const branchConfig = step.config || {};
      const branches = branchConfig.branches || [];
      const conditionalBranches = branches.filter(b => !b.isDefault);

      if (conditionalBranches.length === 0) {
        issues.push({ type: 'error', message: `Determinator "${step.name}" has no branches` });
      }
    }
  });

  if (issues.some(i => i.type === 'error')) {
    return { status: 'error', issues };
  }
  if (issues.some(i => i.type === 'warning')) {
    return { status: 'warning', issues };
  }

  return { status: 'complete', issues, message: `${steps.length} step${steps.length !== 1 ? 's' : ''} configured` };
}

/**
 * Validate settings
 */
function validateSettings(workflow) {
  const issues = [];

  if (!workflow.settings?.allowReenrollment) {
    issues.push({
      type: 'warning',
      message: 'Re-enrollment is disabled - records can only go through once'
    });
  }

  if (issues.some(i => i.type === 'warning')) {
    return { status: 'warning', issues };
  }

  return { status: 'complete', issues };
}

export default function ReviewWorkflowSidebar({
  workflow,
  steps,
  onClose,
  onActivate,
  isActivating = false
}) {
  const objectConfig = OBJECT_TYPE_CONFIG[workflow.objectType] || {};
  const triggerLabel =
    ENTRY_CONDITION_TYPES.find((t) => t.value === workflow.entryCondition?.triggerType)?.label ||
    workflow.entryCondition?.triggerType ||
    'Not configured';

  // Fetch dependencies on mount
  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        setLoadingDeps(true);
        const { data } = await apiClient.get(`/api/v1/workflows/${workflow.id}/dependencies`);
        setDependencies(data);
      } catch (err) {
        console.error('Error fetching dependencies:', err);
        setDepsError(err.message);
      } finally {
        setLoadingDeps(false);
      }
    };

    if (workflow.id) {
      fetchDependencies();
    } else {
      setLoadingDeps(false);
    }
  }, [workflow.id]);

  // Validate each section
  const triggerValidation = validateTrigger(workflow);
  const stepsValidation = validateSteps(steps);
  const settingsValidation = validateSettings(workflow);

  // Dependencies status
  const getDependenciesStatus = () => {
    if (loadingDeps) return 'loading';
    if (depsError) return 'error';

    // Check if any dependencies are missing/broken
    if (dependencies) {
      const hasIssues = dependencies.workflows?.some(w => !w.exists) ||
                        dependencies.tasks?.some(t => !t.exists) ||
                        dependencies.emails?.some(e => !e.exists);
      if (hasIssues) return 'error';
    }

    return 'complete';
  };

  // Overall status
  const hasErrors = triggerValidation.status === 'error' ||
                    stepsValidation.status === 'error';

  const handleActivate = () => {
    if (!hasErrors) {
      onActivate();
    }
  };

  return (
    <div
      className={cn(
        'fixed right-0 top-0 h-full w-[400px] z-50',
        'bg-[var(--bb-color-bg-elevated)] border-l border-[var(--bb-color-border-subtle)]',
        'shadow-2xl flex flex-col'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--bb-color-border-subtle)]">
        <h2 className="text-lg font-semibold text-[var(--bb-color-text-primary)]">
          Review before activating
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[var(--bb-color-bg-surface)] rounded text-[var(--bb-color-text-tertiary)]"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Workflow summary */}
        <div className="p-3 bg-[var(--bb-color-bg-surface)] rounded-lg border border-[var(--bb-color-border-subtle)] mb-4">
          <div className="text-sm font-medium text-[var(--bb-color-text-primary)] mb-2">
            {workflow.name}
          </div>
          <div className="text-xs text-[var(--bb-color-text-tertiary)] space-y-1">
            <div className="flex justify-between">
              <span>Object type:</span>
              <span className="text-[var(--bb-color-text-secondary)] flex items-center gap-1">
                {objectConfig.color && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: objectConfig.color }}
                  />
                )}
                {objectConfig.label || workflow.objectType}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Trigger:</span>
              <span className="text-[var(--bb-color-text-secondary)]">{triggerLabel}</span>
            </div>
          </div>
        </div>

        {/* Checklist sections */}
        <ChecklistSection
          title="Trigger configured"
          icon={<Zap className="w-4 h-4 text-[var(--bb-color-text-tertiary)]" />}
          status={triggerValidation.status}
          defaultOpen={triggerValidation.status === 'error'}
        >
          {triggerValidation.issues.length > 0 ? (
            <div className="space-y-2">
              {triggerValidation.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {issue.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                  )}
                  <span className={issue.type === 'error' ? 'text-[#FCA5A5]' : 'text-[#FCD34D]'}>
                    {issue.message}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#6EE7B7]">
              <CheckCircle className="w-4 h-4" />
              <span>Trigger is properly configured</span>
            </div>
          )}
        </ChecklistSection>

        <ChecklistSection
          title="Steps configured"
          icon={<ListChecks className="w-4 h-4 text-[var(--bb-color-text-tertiary)]" />}
          status={stepsValidation.status}
          defaultOpen={stepsValidation.status === 'error'}
        >
          {stepsValidation.issues.length > 0 ? (
            <div className="space-y-2">
              {stepsValidation.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {issue.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                  )}
                  <span className={issue.type === 'error' ? 'text-[#FCA5A5]' : 'text-[#FCD34D]'}>
                    {issue.message}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#6EE7B7]">
              <CheckCircle className="w-4 h-4" />
              <span>{stepsValidation.message || 'All steps configured'}</span>
            </div>
          )}
        </ChecklistSection>

        <ChecklistSection
          title="Settings reviewed"
          icon={<Settings className="w-4 h-4 text-[var(--bb-color-text-tertiary)]" />}
          status={settingsValidation.status}
          defaultOpen={settingsValidation.status === 'error'}
        >
          {settingsValidation.issues.length > 0 ? (
            <div className="space-y-2">
              {settingsValidation.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {issue.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                  )}
                  <span className={issue.type === 'error' ? 'text-[#FCA5A5]' : 'text-[#FCD34D]'}>
                    {issue.message}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#6EE7B7]">
              <CheckCircle className="w-4 h-4" />
              <span>Settings are properly configured</span>
            </div>
          )}
        </ChecklistSection>

        <ChecklistSection
          title="Dependencies resolved"
          icon={<GitBranch className="w-4 h-4 text-[var(--bb-color-text-tertiary)]" />}
          status={getDependenciesStatus()}
          defaultOpen={getDependenciesStatus() === 'error'}
        >
          {loadingDeps ? (
            <div className="flex items-center gap-2 text-sm text-[var(--bb-color-text-tertiary)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking dependencies...</span>
            </div>
          ) : depsError ? (
            <div className="flex items-start gap-2 text-sm text-[#FCA5A5]">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>Error checking dependencies: {depsError}</span>
            </div>
          ) : dependencies ? (
            <div className="space-y-2 text-sm">
              {dependencies.workflows?.length > 0 && (
                <div className="text-[var(--bb-color-text-secondary)]">
                  Linked workflows: {dependencies.workflows.length}
                </div>
              )}
              {dependencies.properties?.length > 0 && (
                <div className="text-[var(--bb-color-text-secondary)]">
                  Properties used: {dependencies.properties.length}
                </div>
              )}
              {!dependencies.workflows?.length && !dependencies.properties?.length && (
                <div className="flex items-center gap-2 text-[#6EE7B7]">
                  <CheckCircle className="w-4 h-4" />
                  <span>No external dependencies</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#6EE7B7]">
              <CheckCircle className="w-4 h-4" />
              <span>No dependencies to check</span>
            </div>
          )}
        </ChecklistSection>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--bb-color-border-subtle)] space-y-3">
        {hasErrors && (
          <div className="flex items-start gap-2 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-lg">
            <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
            <span className="text-sm text-[#FCA5A5]">
              Fix the errors above before activating
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleActivate}
            disabled={hasErrors || isActivating}
            loading={isActivating}
            className="flex-1 bg-[#10B981] hover:bg-[#059669]"
          >
            {isActivating ? 'Activating...' : 'Activate workflow'}
          </Button>
        </div>
      </div>
    </div>
  );
}
