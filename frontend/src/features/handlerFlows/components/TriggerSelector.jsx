import { X, ChevronRight, Search, Database, Mail, Globe, Zap, Code } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useState } from 'react';

// Trigger categories matching HubSpot's structure
const triggerCategories = [
  { recordId: 'data-values',
    name: 'Data values',
    description: 'When data is created, changed or meets conditions',
    icon: <Database className="w-5 h-5" />,
    color: 'text-cyan-600',
    triggers: [
      { recordId: 'segment.changed',
        label: 'List membership changed',
        description: 'When a record is added or removed from a list',
        requiresObject: true,
        subOptions: [
          { recordId: 'is_member', label: 'Is a member of a list' },
          { recordId: 'not_member', label: 'Is not a member of a list' },
          { recordId: 'added', label: 'Added to list' },
          { recordId: 'removed', label: 'Removed from list' },
        ],
      },
      { recordId: 'property.changed',
        label: 'Property value changed',
        description: "When a record's property value is added, edited, or removed",
        requiresObject: true,
        subOptions: [
          { recordId: 'one_property', label: 'One property value changed', description: 'One property is edited, added, or removed' },
          { recordId: 'multiple_properties', label: 'Multiple property values were met', description: 'One or more properties are edited, added, or removed' },
        ],
      },
      { recordId: 'record.created',
        label: 'Record created',
        description: 'When a new record is created in the system',
        requiresObject: true,
      },
      { recordId: 'filter.met',
        label: 'Record meets a set of filter conditions',
        description: 'When a record meets multiple conditions',
        requiresObject: true,
      },
    ],
  },
  { recordId: 'communication',
    name: 'Emails, calls, & communication',
    description: 'When information is sent or discussed',
    icon: <Mail className="w-5 h-5" />,
    color: 'text-orange-600',
    triggers: [
      { recordId: 'email.sent',
        label: 'Email sent',
        description: 'When an email is sent to a contact',
        requiresObject: false,
      },
      { recordId: 'email.opened',
        label: 'Email opened',
        description: 'When a contact opens an email',
        requiresObject: false,
      },
      { recordId: 'sms.received',
        label: 'SMS received',
        description: 'When an SMS message is received',
        requiresObject: false,
      },
    ],
  },
  { recordId: 'websites',
    name: 'Websites & media',
    description: 'When websites and media are interacted with',
    icon: <Globe className="w-5 h-5" />,
    color: 'text-purple-600 dark:text-purple-400',
    triggers: [
      { recordId: 'form.submitted',
        label: 'Form submitted',
        description: 'When a form is submitted on your website',
        requiresObject: false,
      },
      { recordId: 'page.visited',
        label: 'Page visited',
        description: 'When a specific page is visited',
        requiresObject: false,
      },
    ],
  },
  { recordId: 'automations',
    name: 'Automations triggered',
    description: 'When automated steps start or complete',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-yellow-600',
    triggers: [
      { recordId: 'workflow.completed',
        label: 'Workflow completed',
        description: 'When another workflow is completed',
        requiresObject: false,
      },
    ],
  },
  { recordId: 'custom',
    name: 'Custom events & external events',
    description: 'Requires custom configuration',
    icon: <Code className="w-5 h-5" />,
    color: 'text-gray-600 dark:text-text-secondary',
    triggers: [
      { recordId: 'webhook.received',
        label: 'Received a webhook from an external app',
        description: 'When an external app sends data to BarkBase',
        requiresObject: false,
      },
      { recordId: 'custom.event',
        label: 'Custom events',
        description: 'Trigger based on custom events tracked in your system',
        requiresObject: true,
      },
    ],
  },
];

// Object types for enrollment (pulled from system - in real app this would be dynamic)
const enrollmentObjects = [
  { recordId: 'owner', label: 'Owner', description: 'Pet owners and guardians' },
  { recordId: 'pet', label: 'Pet', description: 'Dogs, cats, and other animals' },
  { recordId: 'booking', label: 'Booking', description: 'Reservations and stays' },
  { recordId: 'invoice', label: 'Invoice', description: 'Bills and payments' },
  { recordId: 'property', label: 'Property', description: 'Custom property records' },
];

// Step indicator component
const StepIndicator = ({ currentStep }) => {
  const steps = [
    { recordId: 'trigger', label: 'Start triggers' },
    { recordId: 'object', label: 'Eligible records' },
    { recordId: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/50">
      {steps.map((step, index) => (
        <div key={step.recordId} className="flex items-center flex-1">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
                currentStep === step.recordId
                  ? 'bg-primary text-white'
                  : steps.findIndex(s => s.recordId === currentStep) > index
                  ? 'bg-primary text-white'
                  : 'bg-border text-muted'
              )}
            >
              {steps.findIndex(s => s.recordId === currentStep) > index ? '✓' : index + 1}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                currentStep === step.recordId ? 'text-text' : 'text-muted'
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 bg-border mx-2" />
          )}
        </div>
      ))}
    </div>
  );
};

const TriggerSelector = ({ onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(['data-values']); // Start with data values expanded
  const [step, setStep] = useState('trigger'); // 'trigger', 'sub-option', 'object'
  const [selectedTrigger, setSelectedTrigger] = useState(null);
  const [selectedSubOption, setSelectedSubOption] = useState(null);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(recordId => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleTriggerSelect = (trigger) => {
    setSelectedTrigger(trigger);

    if (trigger.subOptions) {
      // Has sub-options, show them first
      setStep('sub-option');
    } else if (trigger.requiresObject) {
      // Need to select object type
      setStep('object');
    } else {
      // No object needed, complete selection
      onSelect({
        type: 'trigger',
        triggerType: trigger.recordId,
        label: trigger.label,
        description: trigger.description,
        object: null,
      });
    }
  };

  const handleSubOptionSelect = (subOption) => {
    setSelectedSubOption(subOption);
    // After selecting sub-option, go to object selection
    setStep('object');
  };

  const handleObjectSelect = (object) => {
    const label = selectedSubOption
      ? `${object.label}: ${selectedSubOption.label}`
      : `${object.label}: ${selectedTrigger.label}`;

    onSelect({
      type: 'trigger',
      triggerType: selectedTrigger.recordId,
      subOption: selectedSubOption?.recordId,
      label,
      description: selectedTrigger.description,
      object: object.recordId,
    });
  };

  const filteredCategories = triggerCategories.map(category => ({
    ...category,
    triggers: category.triggers.filter(trigger =>
      trigger.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trigger.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.triggers.length > 0);

  return (
    <div className="w-[480px] border-r border-border bg-surface flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {step === 'trigger' && 'Choose a trigger to start this workflow'}
            {step === 'sub-option' && `Choose a ${selectedTrigger?.label.toLowerCase()} trigger`}
            {step === 'object' && 'Choose a type of record that can enroll'}
          </h2>
          {step === 'trigger' && (
            <p className="text-xs text-muted mt-1">Select what event will enroll records into this flow</p>
          )}
          {step === 'object' && (
            <p className="text-xs text-muted mt-1">You'll be able to choose records to enroll when you turn the workflow on</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-border/50 rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={step === 'sub-option' ? 'trigger' : step} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === 'trigger' && (
          <>
            {/* Search bar */}
            <div className="p-4 border-b border-border sticky top-0 bg-surface z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="text"
                  placeholder="Search triggers, forms, properties, emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Trigger manually and filter options */}
            <div className="p-4 space-y-2 border-b border-border">
              <button
                onClick={() => {
                  setSelectedTrigger({ recordId: 'manual',
                    label: 'Trigger manually',
                    description: 'Run this workflow on demand',
                    requiresObject: true,
                  });
                  setStep('object');
                }}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-sm font-semibold text-text">Trigger manually</div>
              </button>
              <button
                onClick={() => {
                  setSelectedTrigger({ recordId: 'filter.met',
                    label: 'Met filter criteria',
                    description: 'When a record meets multiple conditions',
                    requiresObject: true,
                  });
                  setStep('object');
                }}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-sm font-semibold text-text">Met filter criteria</div>
              </button>
              <button
                onClick={() => onSelect({
                  type: 'trigger',
                  triggerType: 'schedule',
                  label: 'On a schedule',
                  description: 'Run this workflow on a recurring schedule',
                  object: null,
                })}
                className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="text-sm font-semibold text-text">On a schedule</div>
              </button>
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
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text">{category.name}</div>
                        <div className="text-xs text-muted">{category.description}</div>
                      </div>
                    </button>

                    {/* Category triggers */}
                    {isExpanded && (
                      <div className="bg-background/50">
                        {category.triggers.map((trigger) => (
                          <button
                            key={trigger.recordId}
                            onClick={() => handleTriggerSelect(trigger)}
                            className="w-full px-4 py-3 pl-12 hover:bg-primary/5 transition-colors text-left border-l-4 border-transparent hover:border-primary"
                          >
                            <div className="text-sm font-medium text-text">{trigger.label}</div>
                            <div className="text-xs text-muted mt-0.5">{trigger.description}</div>
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

        {step === 'sub-option' && (
          <div className="p-4">
            <button
              onClick={() => setStep('trigger')}
              className="text-sm text-primary hover:text-primary/80 mb-4"
            >
              ← Back to triggers
            </button>

            <div className="space-y-2">
              {selectedTrigger?.subOptions?.map((subOption) => (
                <button
                  key={subOption.recordId}
                  onClick={() => handleSubOptionSelect(subOption)}
                  className="w-full text-left px-4 py-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="text-sm font-semibold text-text">{subOption.label}</div>
                  {subOption.description && (
                    <div className="text-xs text-muted mt-1">{subOption.description}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'object' && (
          <div className="p-4">
            <button
              onClick={() => setStep(selectedTrigger?.subOptions ? 'sub-option' : 'trigger')}
              className="text-sm text-primary hover:text-primary/80 mb-4"
            >
              ← Back
            </button>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              {enrollmentObjects.map((object) => (
                <button
                  key={object.recordId}
                  onClick={() => handleObjectSelect(object)}
                  className="w-full text-left px-4 py-2 hover:bg-primary/5 transition-colors text-sm text-text"
                >
                  {object.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TriggerSelector;
