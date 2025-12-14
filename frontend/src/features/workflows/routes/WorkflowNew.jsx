/**
 * Workflow Creation Wizard
 * HubSpot-style workflow creation with template selection
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Sparkles,
  Zap,
  Filter,
  Calendar,
  Hand,
  PawPrint,
  Users,
  CreditCard,
  ClipboardList,
  AlertTriangle,
  Syringe,
  MessageSquare,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import { createWorkflow, getWorkflowTemplates, createWorkflowFromTemplate } from '../api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Object type configuration
const OBJECT_TYPE_CONFIG = {
  pet: { label: 'Pet', icon: PawPrint, description: 'Automate actions for pets' },
  booking: { label: 'Booking', icon: Calendar, description: 'Automate booking operations' },
  owner: { label: 'Owner', icon: Users, description: 'Automate owner communications' },
  invoice: { label: 'Invoice', icon: FileText, description: 'Automate payment reminders' },
  task: { label: 'Task', icon: ClipboardList, description: 'Automate task management' },
  incident: { label: 'Incident', icon: AlertTriangle, description: 'Automate incident responses' },
};

// Template category configuration
const TEMPLATE_CATEGORIES = {
  vaccination: { label: 'Vaccination', icon: Syringe, color: 'text-emerald-500' },
  booking: { label: 'Booking', icon: Calendar, color: 'text-blue-500' },
  communication: { label: 'Communication', icon: MessageSquare, color: 'text-purple-500' },
  payment: { label: 'Payment', icon: CreditCard, color: 'text-orange-500' },
  onboarding: { label: 'Onboarding', icon: Users, color: 'text-teal-500' },
};

// Trigger type configuration
const TRIGGER_TYPES = [
  {
    id: 'event',
    label: 'When an event occurs',
    description: 'Trigger when something happens (check-in, booking created, etc.)',
    icon: Zap,
  },
  {
    id: 'filter_criteria',
    label: 'When filter criteria is met',
    description: 'Enroll records that match specific conditions',
    icon: Filter,
  },
  {
    id: 'schedule',
    label: 'On a schedule',
    description: 'Run at specific times (daily, weekly, etc.)',
    icon: Calendar,
  },
  {
    id: 'manual',
    label: 'Manual enrollment only',
    description: 'Only enroll records when you manually add them',
    icon: Hand,
  },
];

// Wizard steps
const WIZARD_STEPS = {
  METHOD: 'method',
  TEMPLATE: 'template',
  OBJECT_TYPE: 'object_type',
  TRIGGER_TYPE: 'trigger_type',
  CONFIGURE: 'configure',
};

// Template Card
const TemplateCard = ({ template, selected, onClick }) => {
  const categoryConfig = TEMPLATE_CATEGORIES[template.category] || {};
  const CategoryIcon = categoryConfig.icon || FileText;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all',
        selected
          ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] ring-2 ring-[color:var(--bb-color-accent)]'
          : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)] hover:shadow-md'
      )}
      style={{ backgroundColor: selected ? undefined : 'var(--bb-color-bg-surface)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
            selected ? 'bg-[color:var(--bb-color-accent)]' : 'bg-[color:var(--bb-color-bg-elevated)]'
          )}
        >
          <CategoryIcon className={cn('h-5 w-5', selected ? 'text-white' : categoryConfig.color || 'text-[color:var(--bb-color-accent)]')} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-[color:var(--bb-color-text-primary)] truncate">{template.name}</h3>
            {selected && <CheckCircle className="h-4 w-4 text-[color:var(--bb-color-accent)] shrink-0" />}
          </div>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1 line-clamp-2">{template.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-[color:var(--bb-color-text-muted)]">
            <span className="capitalize">{template.object_type}</span>
            {template.usage_count > 0 && (
              <span>{template.usage_count} uses</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

// Object Type Card
// eslint-disable-next-line no-unused-vars
const ObjectTypeCard = ({ type, config, selected, onClick }) => {
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all min-w-[120px]',
        selected
          ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] ring-2 ring-[color:var(--bb-color-accent)]'
          : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)]'
      )}
      style={{ backgroundColor: selected ? undefined : 'var(--bb-color-bg-surface)' }}
    >
      <div
        className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center',
          selected ? 'bg-[color:var(--bb-color-accent)]' : 'bg-[color:var(--bb-color-bg-elevated)]'
        )}
      >
        <Icon className={cn('h-6 w-6', selected ? 'text-white' : 'text-[color:var(--bb-color-accent)]')} />
      </div>
      <span className="text-sm font-medium text-[color:var(--bb-color-text-primary)]">{config.label}</span>
      {selected && <CheckCircle className="h-4 w-4 text-[color:var(--bb-color-accent)]" />}
    </button>
  );
};

// Trigger Type Card
const TriggerTypeCard = ({ trigger, selected, onClick }) => {
  const Icon = trigger.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all',
        selected
          ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] ring-2 ring-[color:var(--bb-color-accent)]'
          : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)]'
      )}
      style={{ backgroundColor: selected ? undefined : 'var(--bb-color-bg-surface)' }}
    >
      <div
        className={cn(
          'h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
          selected ? 'bg-[color:var(--bb-color-accent)]' : 'bg-[color:var(--bb-color-bg-elevated)]'
        )}
      >
        <Icon className={cn('h-6 w-6', selected ? 'text-white' : 'text-[color:var(--bb-color-accent)]')} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-[color:var(--bb-color-text-primary)]">{trigger.label}</h3>
          {selected && <CheckCircle className="h-4 w-4 text-[color:var(--bb-color-accent)]" />}
        </div>
        <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">{trigger.description}</p>
      </div>
    </button>
  );
};

export default function WorkflowNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(WIZARD_STEPS.METHOD);
  const [creationMethod, setCreationMethod] = useState(null); // 'scratch' | 'template'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedObjectType, setSelectedObjectType] = useState('pet');
  const [selectedTriggerType, setSelectedTriggerType] = useState('event');
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');

  // Data state
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Check for direct template parameter
  useEffect(() => {
    const templateId = searchParams.get('template');
    if (templateId) {
      setCreationMethod('template');
      setCurrentStep(WIZARD_STEPS.TEMPLATE);
    }
  }, [searchParams]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const response = await getWorkflowTemplates();
      setTemplates(response.data?.templates || response.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      // Don't show error, just show empty templates
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (currentStep === WIZARD_STEPS.TEMPLATE) {
      fetchTemplates();
    }
  }, [currentStep, fetchTemplates]);

  // Create workflow from scratch
  const createFromScratch = async () => {
    try {
      setCreating(true);
      setError(null);

      const workflowData = {
        name: workflowName || `Unnamed workflow - ${new Date().toLocaleDateString()}`,
        description: workflowDescription || null,
        object_type: selectedObjectType,
        status: 'draft',
        entry_condition: {
          trigger_type: selectedTriggerType,
        },
        settings: {},
      };

      const response = await createWorkflow(workflowData);

      if (response.data?.id || response.id) {
        const workflowId = response.data?.id || response.id;
        toast.success('Workflow created');
        navigate(`/workflows/${workflowId}?panel=trigger`, { replace: true });
      } else {
        throw new Error('Failed to create workflow');
      }
    } catch (err) {
      console.error('Failed to create workflow:', err);
      setError(err.message || 'Failed to create workflow');
      toast.error('Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  // Create workflow from template
  const createFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setCreating(true);
      setError(null);

      const response = await createWorkflowFromTemplate(selectedTemplate.id, {
        name: workflowName || selectedTemplate.name,
      });

      if (response.data?.id || response.id) {
        const workflowId = response.data?.id || response.id;
        toast.success('Workflow created from template');
        navigate(`/workflows/${workflowId}`, { replace: true });
      } else {
        throw new Error('Failed to create workflow from template');
      }
    } catch (err) {
      console.error('Failed to create workflow from template:', err);
      setError(err.message || 'Failed to create workflow');
      toast.error('Failed to create workflow');
    } finally {
      setCreating(false);
    }
  };

  // Handle next step
  const handleNext = () => {
    switch (currentStep) {
      case WIZARD_STEPS.METHOD:
        if (creationMethod === 'template') {
          setCurrentStep(WIZARD_STEPS.TEMPLATE);
        } else {
          setCurrentStep(WIZARD_STEPS.OBJECT_TYPE);
        }
        break;
      case WIZARD_STEPS.TEMPLATE:
        if (selectedTemplate) {
          setCurrentStep(WIZARD_STEPS.CONFIGURE);
        }
        break;
      case WIZARD_STEPS.OBJECT_TYPE:
        setCurrentStep(WIZARD_STEPS.TRIGGER_TYPE);
        break;
      case WIZARD_STEPS.TRIGGER_TYPE:
        setCurrentStep(WIZARD_STEPS.CONFIGURE);
        break;
      case WIZARD_STEPS.CONFIGURE:
        if (creationMethod === 'template') {
          createFromTemplate();
        } else {
          createFromScratch();
        }
        break;
      default:
        break;
    }
  };

  // Handle back
  const handleBack = () => {
    switch (currentStep) {
      case WIZARD_STEPS.TEMPLATE:
      case WIZARD_STEPS.OBJECT_TYPE:
        setCurrentStep(WIZARD_STEPS.METHOD);
        break;
      case WIZARD_STEPS.TRIGGER_TYPE:
        setCurrentStep(WIZARD_STEPS.OBJECT_TYPE);
        break;
      case WIZARD_STEPS.CONFIGURE:
        if (creationMethod === 'template') {
          setCurrentStep(WIZARD_STEPS.TEMPLATE);
        } else {
          setCurrentStep(WIZARD_STEPS.TRIGGER_TYPE);
        }
        break;
      default:
        navigate('/workflows');
        break;
    }
  };

  // Check if can proceed
  const canProceed = () => {
    switch (currentStep) {
      case WIZARD_STEPS.METHOD:
        return creationMethod !== null;
      case WIZARD_STEPS.TEMPLATE:
        return selectedTemplate !== null;
      case WIZARD_STEPS.OBJECT_TYPE:
        return selectedObjectType !== null;
      case WIZARD_STEPS.TRIGGER_TYPE:
        return selectedTriggerType !== null;
      case WIZARD_STEPS.CONFIGURE:
        return true;
      default:
        return false;
    }
  };

  // Get step title
  const getStepTitle = () => {
    switch (currentStep) {
      case WIZARD_STEPS.METHOD:
        return 'Create Workflow';
      case WIZARD_STEPS.TEMPLATE:
        return 'Choose a Template';
      case WIZARD_STEPS.OBJECT_TYPE:
        return 'Select Object Type';
      case WIZARD_STEPS.TRIGGER_TYPE:
        return 'Choose Entry Condition';
      case WIZARD_STEPS.CONFIGURE:
        return 'Configure Workflow';
      default:
        return 'Create Workflow';
    }
  };

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">{getStepTitle()}</h1>
        </div>
        <Button variant="ghost" onClick={() => navigate('/workflows')}>
          Cancel
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step: Method Selection */}
        {currentStep === WIZARD_STEPS.METHOD && (
          <div className="space-y-4">
            <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-6">
              How would you like to create your workflow?
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setCreationMethod('scratch')}
                className={cn(
                  'flex flex-col items-center gap-3 p-6 rounded-xl border transition-all text-center',
                  creationMethod === 'scratch'
                    ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] ring-2 ring-[color:var(--bb-color-accent)]'
                    : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)]'
                )}
                style={{ backgroundColor: creationMethod === 'scratch' ? undefined : 'var(--bb-color-bg-surface)' }}
              >
                <div
                  className={cn(
                    'h-16 w-16 rounded-xl flex items-center justify-center',
                    creationMethod === 'scratch' ? 'bg-[color:var(--bb-color-accent)]' : 'bg-[color:var(--bb-color-bg-elevated)]'
                  )}
                >
                  <FileText className={cn('h-8 w-8', creationMethod === 'scratch' ? 'text-white' : 'text-[color:var(--bb-color-accent)]')} />
                </div>
                <div>
                  <h3 className="font-medium text-[color:var(--bb-color-text-primary)]">From Scratch</h3>
                  <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                    Build a custom workflow tailored to your specific needs
                  </p>
                </div>
                {creationMethod === 'scratch' && <CheckCircle className="h-5 w-5 text-[color:var(--bb-color-accent)]" />}
              </button>

              <button
                onClick={() => setCreationMethod('template')}
                className={cn(
                  'flex flex-col items-center gap-3 p-6 rounded-xl border transition-all text-center',
                  creationMethod === 'template'
                    ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] ring-2 ring-[color:var(--bb-color-accent)]'
                    : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-accent)]'
                )}
                style={{ backgroundColor: creationMethod === 'template' ? undefined : 'var(--bb-color-bg-surface)' }}
              >
                <div
                  className={cn(
                    'h-16 w-16 rounded-xl flex items-center justify-center',
                    creationMethod === 'template' ? 'bg-[color:var(--bb-color-accent)]' : 'bg-[color:var(--bb-color-bg-elevated)]'
                  )}
                >
                  <Sparkles className={cn('h-8 w-8', creationMethod === 'template' ? 'text-white' : 'text-[color:var(--bb-color-accent)]')} />
                </div>
                <div>
                  <h3 className="font-medium text-[color:var(--bb-color-text-primary)]">From Template</h3>
                  <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">
                    Start with a pre-built workflow for common kennel operations
                  </p>
                </div>
                {creationMethod === 'template' && <CheckCircle className="h-5 w-5 text-[color:var(--bb-color-accent)]" />}
              </button>
            </div>
          </div>
        )}

        {/* Step: Template Selection */}
        {currentStep === WIZARD_STEPS.TEMPLATE && (
          <div className="space-y-6">
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              Choose a template to get started quickly with pre-configured steps.
            </p>

            {loadingTemplates ? (
              <LoadingState label="Loading templates..." variant="spinner" />
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 mx-auto mb-4 text-[color:var(--bb-color-text-muted)]" />
                <h3 className="text-lg font-medium text-[color:var(--bb-color-text-primary)] mb-2">No templates available</h3>
                <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">Templates will appear here once they are created.</p>
                <Button variant="secondary" onClick={() => {
                  setCreationMethod('scratch');
                  setCurrentStep(WIZARD_STEPS.OBJECT_TYPE);
                }}>
                  Create from scratch instead
                </Button>
              </div>
            ) : (
              Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
                const categoryConfig = TEMPLATE_CATEGORIES[category] || { label: category, icon: FileText };
                const CategoryIcon = categoryConfig.icon;

                return (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryIcon className={cn('h-4 w-4', categoryConfig.color || 'text-[color:var(--bb-color-text-muted)]')} />
                      <h3 className="text-sm font-medium text-[color:var(--bb-color-text-primary)] capitalize">{categoryConfig.label}</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {categoryTemplates.map((template) => (
                        <TemplateCard
                          key={template.id}
                          template={template}
                          selected={selectedTemplate?.id === template.id}
                          onClick={() => setSelectedTemplate(template)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Step: Object Type Selection */}
        {currentStep === WIZARD_STEPS.OBJECT_TYPE && (
          <div className="space-y-6">
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              What type of record should this workflow operate on?
            </p>

            <div className="flex flex-wrap gap-4">
              {Object.entries(OBJECT_TYPE_CONFIG).map(([type, config]) => (
                <ObjectTypeCard
                  key={type}
                  type={type}
                  config={config}
                  selected={selectedObjectType === type}
                  onClick={() => setSelectedObjectType(type)}
                />
              ))}
            </div>

            {selectedObjectType && (
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <p className="text-sm text-[color:var(--bb-color-text-secondary)]">
                  {OBJECT_TYPE_CONFIG[selectedObjectType]?.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step: Trigger Type Selection */}
        {currentStep === WIZARD_STEPS.TRIGGER_TYPE && (
          <div className="space-y-6">
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              How should records enter this workflow?
            </p>

            <div className="space-y-3">
              {TRIGGER_TYPES.map((trigger) => (
                <TriggerTypeCard
                  key={trigger.id}
                  trigger={trigger}
                  selected={selectedTriggerType === trigger.id}
                  onClick={() => setSelectedTriggerType(trigger.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step: Configure */}
        {currentStep === WIZARD_STEPS.CONFIGURE && (
          <div className="space-y-6">
            <p className="text-sm text-[color:var(--bb-color-text-muted)]">
              Give your workflow a name and description.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder={creationMethod === 'template' && selectedTemplate ? selectedTemplate.name : 'Enter workflow name...'}
                  className="w-full px-4 py-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder={creationMethod === 'template' && selectedTemplate ? selectedTemplate.description : 'Enter description...'}
                  rows={3}
                  className="w-full px-4 py-3 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)] resize-none"
                  style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
                />
              </div>

              {/* Summary */}
              <div
                className="p-4 rounded-lg border"
                style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <h4 className="text-sm font-medium text-[color:var(--bb-color-text-primary)] mb-3">Summary</h4>
                <dl className="space-y-2 text-sm">
                  {creationMethod === 'template' && selectedTemplate && (
                    <div className="flex justify-between">
                      <dt className="text-[color:var(--bb-color-text-muted)]">Template</dt>
                      <dd className="font-medium text-[color:var(--bb-color-text-primary)]">{selectedTemplate.name}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-[color:var(--bb-color-text-muted)]">Object Type</dt>
                    <dd className="font-medium text-[color:var(--bb-color-text-primary)] capitalize">
                      {creationMethod === 'template' && selectedTemplate ? selectedTemplate.object_type : selectedObjectType}
                    </dd>
                  </div>
                  {creationMethod !== 'template' && (
                    <div className="flex justify-between">
                      <dt className="text-[color:var(--bb-color-text-muted)]">Entry Condition</dt>
                      <dd className="font-medium text-[color:var(--bb-color-text-primary)]">
                        {TRIGGER_TYPES.find(t => t.id === selectedTriggerType)?.label}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <Button variant="secondary" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!canProceed() || creating}>
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : currentStep === WIZARD_STEPS.CONFIGURE ? (
            'Create Workflow'
          ) : (
            <>
              Continue
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
