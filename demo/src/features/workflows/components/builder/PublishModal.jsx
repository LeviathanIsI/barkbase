/**
 * PublishModal - Review and publish modal for workflows
 * Shows validation errors/warnings and enrollment options before publishing
 */
import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import { OBJECT_TYPE_CONFIG, ENTRY_CONDITION_TYPES } from '../../constants';

/**
 * Validate workflow and steps for publishing
 */
function validateWorkflow(workflow, steps) {
  const issues = [];

  // Check trigger configuration
  if (!workflow.entryCondition?.triggerType) {
    issues.push({ type: 'error', message: 'No enrollment trigger configured' });
  } else {
    const triggerType = workflow.entryCondition.triggerType;

    if (triggerType === 'filter_criteria' && !workflow.entryCondition.filterConfig) {
      issues.push({ type: 'error', message: 'Filter criteria trigger has no conditions defined' });
    }

    if (triggerType === 'event' && !workflow.entryCondition.eventType) {
      issues.push({ type: 'error', message: 'Event trigger has no event type selected' });
    }

    if (triggerType === 'schedule' && !workflow.entryCondition.scheduleConfig) {
      issues.push({ type: 'error', message: 'Schedule trigger has no schedule defined' });
    }
  }

  // Check for unconfigured steps
  steps.forEach((step) => {
    // Config can be in step.config (from builder), step.actionConfig (camelCase), or step.action_config (snake_case)
    const config = step.config || step.actionConfig || step.action_config || {};

    if (step.actionType === 'send_sms' || step.action_type === 'send_sms') {
      if (!config.message) {
        issues.push({ type: 'error', message: 'SMS action has no message', step: step.name });
      }
    }

    if (step.actionType === 'send_email' || step.action_type === 'send_email') {
      if (!config.subject) {
        issues.push({ type: 'error', message: 'Email action has no subject', step: step.name });
      }
    }

    if (step.actionType === 'create_task' || step.action_type === 'create_task') {
      if (!config.title) {
        issues.push({ type: 'error', message: 'Task action has no title', step: step.name });
      }
    }

    if (step.actionType === 'update_field' || step.action_type === 'update_field') {
      if (!config.property && !config.field) {
        issues.push({ type: 'error', message: 'Update field action has no property selected', step: step.name });
      }
    }

    if (step.actionType === 'webhook' || step.action_type === 'webhook') {
      if (!config.url) {
        issues.push({ type: 'error', message: 'Webhook action has no URL', step: step.name });
      }
    }

    // Check wait steps
    if (step.stepType === 'wait' || step.step_type === 'wait') {
      const waitConfig = step.waitConfig || step.wait_config || {};
      if (!waitConfig.waitType && !waitConfig.wait_type && !waitConfig.duration) {
        issues.push({ type: 'error', message: 'Wait step is not configured', step: step.name });
      }
    }

    // Check determinator steps (multi-branch)
    if (step.stepType === 'determinator' || step.step_type === 'determinator') {
      const config = step.config || {};
      const branches = config.branches || [];

      // Filter out the default "None matched" branch for validation
      const conditionalBranches = branches.filter(b => !b.isDefault);

      if (conditionalBranches.length === 0) {
        issues.push({ type: 'error', message: 'Determinator has no conditional branches', step: step.name });
      } else {
        // Check each conditional branch has conditions defined
        conditionalBranches.forEach((branch, index) => {
          const conditions = branch.conditions?.conditions || [];
          if (conditions.length === 0) {
            issues.push({
              type: 'warning',
              message: `Branch "${branch.name || `Branch ${index + 1}`}" has no conditions defined`,
              step: step.name
            });
          }
        });
      }
    }
  });

  // Warnings
  if (steps.length === 0) {
    issues.push({
      type: 'warning',
      message: 'Workflow has no steps - only enrollment will be tracked',
    });
  }

  if (!workflow.settings?.allowReenrollment) {
    issues.push({
      type: 'warning',
      message: 'Re-enrollment is disabled - records can only go through once',
    });
  }

  return issues;
}

export default function PublishModal({ workflow, steps, onClose, onPublish }) {
  const [enrollExisting, setEnrollExisting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const issues = validateWorkflow(workflow, steps);
  const hasErrors = issues.some((i) => i.type === 'error');

  const objectConfig = OBJECT_TYPE_CONFIG[workflow.objectType] || {};
  const triggerLabel =
    ENTRY_CONDITION_TYPES.find((t) => t.value === workflow.entryCondition?.triggerType)?.label ||
    workflow.entryCondition?.triggerType ||
    'Not configured';

  const handlePublish = async () => {
    if (hasErrors) return;

    setIsPublishing(true);
    try {
      await onPublish({ enrollExisting });
      onClose();
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={cn(
          'bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]',
          'rounded-xl w-full max-w-lg mx-4 shadow-2xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--bb-color-border-subtle)]">
          <h2 className="text-lg font-semibold text-[var(--bb-color-text-primary)]">
            Review and publish
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bb-color-bg-surface)] rounded text-[var(--bb-color-text-tertiary)]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Validation issues */}
          {issues.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--bb-color-text-secondary)]">
                {hasErrors ? 'Issues to fix before publishing' : 'Warnings'}
              </h3>
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-lg',
                    issue.type === 'error'
                      ? 'bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)]'
                      : 'bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)]'
                  )}
                >
                  {issue.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <div
                      className={cn(
                        'text-sm',
                        issue.type === 'error' ? 'text-[#FCA5A5]' : 'text-[#FCD34D]'
                      )}
                    >
                      {issue.message}
                    </div>
                    {issue.step && (
                      <div className="text-xs text-[var(--bb-color-text-tertiary)] mt-1">
                        Step: {issue.step}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.3)] rounded-lg">
              <CheckCircle className="w-4 h-4 text-[#10B981]" />
              <span className="text-sm text-[#6EE7B7]">Workflow is ready to publish</span>
            </div>
          )}

          {/* Enrollment options */}
          {!hasErrors && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-medium text-[var(--bb-color-text-secondary)]">
                Enrollment options
              </h3>

              <label
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg cursor-pointer',
                  'bg-[var(--bb-color-bg-surface)] border border-[var(--bb-color-border-subtle)]',
                  'hover:border-[var(--bb-color-border-strong)]',
                  'transition-colors'
                )}
              >
                <input
                  type="checkbox"
                  checked={enrollExisting}
                  onChange={(e) => setEnrollExisting(e.target.checked)}
                  className="mt-0.5 accent-[var(--bb-color-accent)]"
                />
                <div>
                  <div className="text-sm text-[var(--bb-color-text-primary)]">
                    Enroll existing records that match criteria
                  </div>
                  <div className="text-xs text-[var(--bb-color-text-tertiary)] mt-1">
                    Records that already meet the enrollment criteria will be enrolled immediately
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Summary */}
          <div className="pt-2 border-t border-[var(--bb-color-border-subtle)]">
            <div className="text-sm text-[var(--bb-color-text-tertiary)]">
              <div className="flex justify-between py-1">
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
              <div className="flex justify-between py-1">
                <span>Trigger type:</span>
                <span className="text-[var(--bb-color-text-secondary)]">{triggerLabel}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Steps:</span>
                <span className="text-[var(--bb-color-text-secondary)]">{steps.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[var(--bb-color-border-subtle)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePublish}
            disabled={hasErrors || isPublishing}
            loading={isPublishing}
            className="bg-[#10B981] hover:bg-[#059669]"
          >
            {isPublishing ? 'Publishing...' : 'Publish workflow'}
          </Button>
        </div>
      </div>
    </div>
  );
}
