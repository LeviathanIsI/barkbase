import { X, ChevronRight, Mail, MessageSquare, Star, CheckSquare, Bell, Printer, Ticket, Edit3, FileText, RefreshCw, DollarSign, Copy, GitBranch, Clock, Timer, Code, Webhook as WebhookIcon, Settings, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import TriggerSelector from './TriggerSelector';
import TriggerConfigurator from './TriggerConfigurator';
import ActionConfigurator from './ActionConfigurator';
import { useState } from 'react';

// Kennel-specific action categories
const actionCategories = [
  { recordId: 'communication',
    name: 'Owner Communication',
    icon: <Mail className="w-5 h-5" />,
    color: 'text-blue-600',
    actions: [
      { recordId: 'send-email',
        label: 'Send email to owner',
        description: 'Send templated email with booking/pet details',
        type: 'action',
        actionType: 'email.send',
      },
      { recordId: 'send-sms',
        label: 'Send SMS to owner',
        description: 'Text message reminder or update',
        type: 'action',
        actionType: 'sms.send',
      },
      { recordId: 'send-review',
        label: 'Send review request',
        description: 'Ask for feedback after stay',
        type: 'action',
        actionType: 'review.request',
      },
    ],
  },
  { recordId: 'staff',
    name: 'Staff & Tasks',
    icon: <CheckSquare className="w-5 h-5" />,
    color: 'text-purple-600',
    actions: [
      { recordId: 'create-task',
        label: 'Create staff task',
        description: 'Assign task to team member with due date',
        type: 'action',
        actionType: 'task.create',
      },
      { recordId: 'notify-team',
        label: 'Send internal notification',
        description: 'Alert staff via in-app, email, or Slack',
        type: 'action',
        actionType: 'team.notify',
      },
      { recordId: 'print-document',
        label: 'Print document',
        description: 'Generate run card, meal plan, or invoice',
        type: 'action',
        actionType: 'print.document',
      },
    ],
  },
  { recordId: 'records',
    name: 'Records & Data',
    icon: <FileText className="w-5 h-5" />,
    color: 'text-cyan-600',
    actions: [
      { recordId: 'set-field',
        label: 'Set field value',
        description: 'Update any field on pet, owner, or booking',
        type: 'action',
        actionType: 'field.set',
      },
      { recordId: 'create-reservation',
        label: 'Create reservation',
        description: 'Create a new booking/reservation',
        type: 'action',
        actionType: 'reservation.create',
      },
      { recordId: 'create-note',
        label: 'Create note',
        description: 'Add note attached to pet or booking',
        type: 'action',
        actionType: 'note.create',
      },
      { recordId: 'update-status',
        label: 'Update status',
        description: 'Change booking/invoice/ticket stage',
        type: 'action',
        actionType: 'status.update',
      },
      { recordId: 'cancel-reservation',
        label: 'Cancel reservation',
        description: 'Cancel an existing booking',
        type: 'action',
        actionType: 'reservation.cancel',
      },
      { recordId: 'increase-number',
        label: 'Increase/decrease number',
        description: 'Adjust visit counter, loyalty points, etc.',
        type: 'action',
        actionType: 'field.increment',
      },
    ],
  },
  { recordId: 'billing',
    name: 'Billing & Payments',
    icon: <DollarSign className="w-5 h-5" />,
    color: 'text-green-600',
    actions: [
      { recordId: 'apply-fee',
        label: 'Apply fee',
        description: 'Add late fee or other charges',
        type: 'action',
        actionType: 'fee.add',
      },
      { recordId: 'apply-discount',
        label: 'Apply discount',
        description: 'Apply discount or promo code',
        type: 'action',
        actionType: 'discount.apply',
      },
      { recordId: 'create-invoice',
        label: 'Create invoice',
        description: 'Generate invoice for booking or services',
        type: 'action',
        actionType: 'invoice.create',
      },
    ],
  },
  { recordId: 'pet-services',
    name: 'Pet Services',
    icon: <Star className="w-5 h-5" />,
    color: 'text-orange-600',
    actions: [
      { recordId: 'vaccination-remind',
        label: 'Send vaccination reminder',
        description: 'Remind owner about upcoming vaccinations',
        type: 'action',
        actionType: 'vaccination.remind',
      },
      { recordId: 'generate-pdf',
        label: 'Generate PDF',
        description: 'Create PDF document from template',
        type: 'action',
        actionType: 'pdf.generate',
      },
      { recordId: 'generate-file',
        label: 'Generate file (CSV/XLSX)',
        description: 'Export data to file format',
        type: 'action',
        actionType: 'file.generate',
      },
    ],
  },
  { recordId: 'segments',
    name: 'Segments & Lists',
    icon: <GitBranch className="w-5 h-5" />,
    color: 'text-pink-600',
    actions: [
      { recordId: 'add-to-segment',
        label: 'Add to static segment',
        description: 'Add owner/pet to a saved list',
        type: 'action',
        actionType: 'segment.add',
      },
      { recordId: 'remove-from-segment',
        label: 'Remove from static segment',
        description: 'Remove from an existing list',
        type: 'action',
        actionType: 'segment.remove',
      },
    ],
  },
  { recordId: 'logic',
    name: 'Logic & Control',
    icon: <GitBranch className="w-5 h-5" />,
    color: 'text-yellow-600',
    actions: [
      { recordId: 'if-then',
        label: 'If/Then check',
        description: 'Branch based on conditions (returns to main flow)',
        type: 'condition',
        actionType: 'if-then',
      },
      { recordId: 'delay-duration',
        label: 'Delay for duration',
        description: 'Wait hours/days before next step',
        type: 'delay',
        actionType: 'delay-duration',
      },
      { recordId: 'delay-until',
        label: 'Delay until time',
        description: 'Wait until specific day/time or business hours',
        type: 'delay',
        actionType: 'delay-until',
      },
      { recordId: 'value-split',
        label: 'Value-based split',
        description: 'Route by accommodation type or field value',
        type: 'condition',
        actionType: 'value-split',
      },
    ],
  },
  { recordId: 'advanced',
    name: 'Advanced',
    icon: <Code className="w-5 h-5" />,
    color: 'text-gray-600',
    actions: [
      { recordId: 'custom-code',
        label: 'Custom code',
        description: 'Execute JavaScript for complex logic',
        type: 'action',
        actionType: 'custom.js',
      },
      { recordId: 'webhook',
        label: 'Send webhook',
        description: 'Call external API or system',
        type: 'action',
        actionType: 'http.webhook',
      },
      { recordId: 'queue-enqueue',
        label: 'Enqueue job',
        description: 'Add job to processing queue',
        type: 'action',
        actionType: 'queue.enqueue',
      },
      { recordId: 'owner-notify',
        label: 'Notify owner',
        description: 'Send notification via email or SMS',
        type: 'action',
        actionType: 'owner.notify',
      },
    ],
  },
];

const ContextSidebar = ({ mode, selectedNode, onClose, onNodeSelect, onNodeUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(['communication']); // Start with first category expanded

  // Don't render sidebar if no mode is active
  if (!mode) return null;

  // Show TriggerSelector if trigger node hasn't been configured yet
  if (mode === 'edit' && selectedNode?.type === 'trigger' && !selectedNode?.data?.triggerType) {
    return <TriggerSelector onClose={onClose} onSelect={(triggerData) => {
      // Save the trigger type and object to the node (exclude 'type' field)
      const { type, ...dataToSave } = triggerData;
      onNodeUpdate(selectedNode.recordId, dataToSave);
      // Keep sidebar open but switch to TriggerConfigurator view
      // The node will update and re-render with the new data
    }} />;
  }

  // Show TriggerConfigurator when editing a configured trigger node
  if (mode === 'edit' && selectedNode?.type === 'trigger') {
    return <TriggerConfigurator trigger={selectedNode} onClose={onClose} onUpdate={onNodeUpdate} />;
  }

  // Show ActionConfigurator when editing a non-trigger node
  if (mode === 'edit' && selectedNode && selectedNode.type !== 'trigger') {
    return (
      <div className="w-96 border-r border-border bg-surface flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Configure action</h2>
            <p className="text-xs text-muted mt-1">Customize this step</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-border/50 rounded transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <ActionConfigurator node={selectedNode} onUpdate={onNodeUpdate} />
        </div>
      </div>
    );
  }

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(recordId => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const filteredCategories = actionCategories.map(category => ({
    ...category,
    actions: category.actions.filter(action =>
      action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.actions.length > 0);

  return (
    <div className="w-96 border-r border-border bg-surface flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {mode === 'add' ? 'Choose an action' : 'Configure action'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-border/50 rounded transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {mode === 'add' && (
          <>
            {/* Search bar */}
            <div className="p-4 border-b border-border sticky top-0 bg-surface z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search actions"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Expandable categories */}
            <div className="divide-y divide-border">
              {filteredCategories.map((category) => {
                const isExpanded = expandedCategories.includes(category.recordId);
                return (
                  <div key={category.recordId}>
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(category.recordId)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-border/30 transition-colors text-left"
                    >
                      <ChevronRight
                        className={cn(
                          'w-4 h-4 transition-transform flex-shrink-0',
                          isExpanded && 'rotate-90'
                        )}
                      />
                      <div className={cn('flex-shrink-0', category.color)}>
                        {category.icon}
                      </div>
                      <span className="text-sm font-semibold text-text">{category.name}</span>
                    </button>

                    {/* Category actions */}
                    {isExpanded && (
                      <div className="bg-background/50">
                        {category.actions.map((action) => (
                          <button
                            key={action.recordId}
                            onClick={() => onNodeSelect({
                              type: action.type,
                              label: action.label,
                              description: action.description,
                              actionType: action.actionType,
                            })}
                            className="w-full px-4 py-3 pl-12 hover:bg-primary/5 transition-colors text-left border-l-4 border-transparent hover:border-primary"
                          >
                            <div className="text-sm font-medium text-text">{action.label}</div>
                            <div className="text-xs text-muted mt-0.5">{action.description}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default ContextSidebar;
