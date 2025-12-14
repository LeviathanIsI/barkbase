/**
 * Workflow Creation
 * - From scratch: Create immediately and go to builder
 * - From template: Show template picker, then create and go to builder
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Loader2,
  ChevronLeft,
  FileText,
  Calendar,
  MessageSquare,
  CreditCard,
  Users,
  Syringe,
  Search,
  CheckCircle2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { createWorkflow, getWorkflowTemplates, createWorkflowFromTemplate } from '../api';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

// Template category icons
const CATEGORY_ICONS = {
  vaccination: Syringe,
  booking: Calendar,
  communication: MessageSquare,
  payment: CreditCard,
  onboarding: Users,
};

const CATEGORY_COLORS = {
  vaccination: 'text-emerald-500 bg-emerald-500/10',
  booking: 'text-blue-500 bg-blue-500/10',
  communication: 'text-purple-500 bg-purple-500/10',
  payment: 'text-orange-500 bg-orange-500/10',
  onboarding: 'text-teal-500 bg-teal-500/10',
};

export default function WorkflowNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  // Template selection state
  const method = searchParams.get('method');
  const isTemplateMode = method === 'template';
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Create workflow from scratch (immediate)
  const createFromScratch = useCallback(async () => {
    try {
      setCreating(true);
      const workflowData = {
        name: 'Unnamed workflow',
        object_type: 'pet',
        status: 'draft',
        entry_condition: { trigger_type: 'manual' },
        settings: {},
      };

      const response = await createWorkflow(workflowData);
      const workflowId = response.data?.id || response.id;

      if (workflowId) {
        navigate(`/workflows/${workflowId}?panel=trigger`, { replace: true });
      } else {
        throw new Error('Failed to create workflow');
      }
    } catch (err) {
      console.error('Failed to create workflow:', err);
      setError(err.message || 'Failed to create workflow');
      toast.error('Failed to create workflow');
      setTimeout(() => navigate('/workflows'), 2000);
    }
  }, [navigate]);

  // Create workflow from template
  const createFromTemplate = useCallback(async (templateId) => {
    try {
      setCreating(true);
      const response = await createWorkflowFromTemplate(templateId);
      const workflowId = response.data?.id || response.id;

      if (workflowId) {
        toast.success('Workflow created from template');
        navigate(`/workflows/${workflowId}?panel=trigger`, { replace: true });
      } else {
        throw new Error('Failed to create workflow from template');
      }
    } catch (err) {
      console.error('Failed to create workflow from template:', err);
      setError(err.message || 'Failed to create workflow');
      toast.error('Failed to create workflow');
      setCreating(false);
    }
  }, [navigate]);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const response = await getWorkflowTemplates();
      setTemplates(response.data?.templates || response.templates || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // On mount: either create immediately or load templates
  useEffect(() => {
    if (isTemplateMode) {
      fetchTemplates();
    } else {
      createFromScratch();
    }
  }, [isTemplateMode, createFromScratch, fetchTemplates]);

  // Handle template selection and creation
  const handleUseTemplate = () => {
    if (selectedTemplate) {
      createFromTemplate(selectedTemplate.id);
    }
  };

  // Filter templates by search
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by category
  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    const category = template.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {});

  // Error state
  if (error && !isTemplateMode) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Loading state for "from scratch"
  if (!isTemplateMode) {
    return (
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[color:var(--bb-color-accent)]" />
          <p className="text-[color:var(--bb-color-text-primary)]">Creating workflow...</p>
        </div>
      </div>
    );
  }

  // Template selection view
  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col -mx-6 -mt-6">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/workflows')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)]">
            Choose a template
          </h1>
        </div>
        <Button
          onClick={handleUseTemplate}
          disabled={!selectedTemplate || creating}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Use template'
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[color:var(--bb-color-accent)]"
            style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
          />
        </div>
      </div>

      {/* Templates */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {loadingTemplates ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[color:var(--bb-color-accent)]" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-[color:var(--bb-color-text-muted)]" />
            <h3 className="text-lg font-medium text-[color:var(--bb-color-text-primary)] mb-2">
              No templates available
            </h3>
            <p className="text-sm text-[color:var(--bb-color-text-muted)] mb-4">
              Create a workflow from scratch instead.
            </p>
            <Button onClick={() => navigate('/workflows/new')}>
              Create from scratch
            </Button>
          </div>
        ) : (
          <div className="space-y-8 max-w-4xl">
            {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
              const Icon = CATEGORY_ICONS[category] || FileText;
              const colorClass = CATEGORY_COLORS[category] || 'text-gray-500 bg-gray-500/10';
              const [textColor, bgColor] = colorClass.split(' ');

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center', bgColor)}>
                      <Icon className={cn('h-4 w-4', textColor)} />
                    </div>
                    <h2 className="text-sm font-semibold text-[color:var(--bb-color-text-primary)] uppercase tracking-wide">
                      {category}
                    </h2>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {categoryTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all',
                          selectedTemplate?.id === template.id
                            ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)] ring-2 ring-[color:var(--bb-color-accent)]'
                            : 'border-[color:var(--bb-color-border-subtle)] hover:border-[color:var(--bb-color-border-default)] hover:shadow-md'
                        )}
                        style={{
                          backgroundColor: selectedTemplate?.id === template.id ? undefined : 'var(--bb-color-bg-surface)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm text-[color:var(--bb-color-text-primary)] mb-1">
                              {template.name}
                            </h3>
                            <p className="text-xs text-[color:var(--bb-color-text-muted)] line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <CheckCircle2 className="h-5 w-5 text-[color:var(--bb-color-accent)] shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-xs text-[color:var(--bb-color-text-muted)]">
                          <span className="capitalize">{template.object_type}</span>
                          {template.usage_count > 0 && (
                            <>
                              <span>·</span>
                              <span>{template.usage_count} uses</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
