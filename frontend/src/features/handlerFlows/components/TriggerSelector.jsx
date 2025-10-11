import { X, Calendar, Zap, Filter, Webhook, MousePointer } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import { useState } from 'react';

const triggerTypes = [
  {
    id: 'manual',
    label: 'Manually triggered',
    description: 'Run this flow on demand for specific records',
    icon: <MousePointer className="w-8 h-8" />,
    category: 'basic',
  },
  {
    id: 'event',
    label: 'When an event occurs',
    description: 'Booking created, Pet checked in, Status changed, etc.',
    icon: <Zap className="w-8 h-8" />,
    category: 'basic',
    popular: true,
  },
  {
    id: 'filter',
    label: 'When filter criteria is met',
    description: 'Vaccination expires ≤7 days, Invoice overdue, etc.',
    icon: <Filter className="w-8 h-8" />,
    category: 'basic',
    popular: true,
  },
  {
    id: 'schedule',
    label: 'Based on a schedule',
    description: 'Daily at 9:00 AM, Weekly on Mondays, etc.',
    icon: <Calendar className="w-8 h-8" />,
    category: 'basic',
  },
  {
    id: 'webhook',
    label: 'When a webhook is received',
    description: 'Triggered by external system or API call',
    icon: <Webhook className="w-8 h-8" />,
    category: 'advanced',
  },
];

// Event-based triggers (most common)
const eventTriggers = [
  { id: 'booking.created', label: 'Booking created', object: 'Booking' },
  { id: 'booking.updated', label: 'Booking updated', object: 'Booking' },
  { id: 'booking.confirmed', label: 'Booking confirmed', object: 'Booking' },
  { id: 'booking.cancelled', label: 'Booking cancelled', object: 'Booking' },
  { id: 'pet.checkedin', label: 'Pet checked in', object: 'Pet' },
  { id: 'pet.checkedout', label: 'Pet checked out', object: 'Pet' },
  { id: 'pet.created', label: 'Pet profile created', object: 'Pet' },
  { id: 'invoice.created', label: 'Invoice created', object: 'Invoice' },
  { id: 'invoice.paid', label: 'Invoice paid', object: 'Invoice' },
  { id: 'invoice.overdue', label: 'Invoice overdue', object: 'Invoice' },
  { id: 'owner.created', label: 'Owner profile created', object: 'Owner' },
  { id: 'owner.updated', label: 'Owner profile updated', object: 'Owner' },
];

const TriggerSelector = ({ onClose, onSelect }) => {
  const [step, setStep] = useState('type'); // 'type' or 'event'
  const [selectedType, setSelectedType] = useState(null);

  const handleTypeSelect = (type) => {
    if (type.id === 'event') {
      setSelectedType(type);
      setStep('event');
    } else {
      // For other types, select immediately
      onSelect({
        type: 'trigger',
        triggerType: type.id,
        label: type.label,
        description: type.description,
      });
    }
  };

  const handleEventSelect = (event) => {
    onSelect({
      type: 'trigger',
      triggerType: 'event',
      eventId: event.id,
      label: event.label,
      description: `When ${event.label.toLowerCase()} in BarkBase`,
      object: event.object,
    });
  };

  return (
    <div className="w-96 border-r border-border bg-surface flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">
            {step === 'type' ? 'Choose a trigger' : 'Select event'}
          </h2>
          <p className="text-xs text-muted mt-1">
            {step === 'type'
              ? 'Start when this happens'
              : 'Choose what event starts this flow'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-border/50 rounded transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {step === 'type' && (
          <div className="space-y-4">
            {/* Basic triggers */}
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase mb-3">Start triggers</h3>
              <div className="space-y-2">
                {triggerTypes
                  .filter(t => t.category === 'basic')
                  .map((trigger) => (
                    <button
                      key={trigger.id}
                      onClick={() => handleTypeSelect(trigger)}
                      className={cn(
                        'w-full text-left p-4 rounded-lg border border-border',
                        'hover:border-primary hover:bg-primary/5',
                        'transition-colors cursor-pointer',
                        'flex items-start gap-4 relative'
                      )}
                    >
                      {trigger.popular && (
                        <div className="absolute top-2 right-2">
                          <span className="text-xs bg-primary text-white px-2 py-0.5 rounded font-medium">
                            Popular
                          </span>
                        </div>
                      )}
                      <div className="flex-shrink-0 text-primary">
                        {trigger.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text">{trigger.label}</div>
                        <div className="text-xs text-muted mt-1">{trigger.description}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Advanced triggers */}
            <div>
              <h3 className="text-xs font-semibold text-muted uppercase mb-3">Advanced options</h3>
              <div className="space-y-2">
                {triggerTypes
                  .filter(t => t.category === 'advanced')
                  .map((trigger) => (
                    <button
                      key={trigger.id}
                      onClick={() => handleTypeSelect(trigger)}
                      className={cn(
                        'w-full text-left p-4 rounded-lg border border-border',
                        'hover:border-primary hover:bg-primary/5',
                        'transition-colors cursor-pointer',
                        'flex items-start gap-4'
                      )}
                    >
                      <div className="flex-shrink-0 text-primary">
                        {trigger.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text">{trigger.label}</div>
                        <div className="text-xs text-muted mt-1">{trigger.description}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {step === 'event' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('type')}
              className="mb-2"
            >
              ← Back to trigger types
            </Button>

            {/* Group by object */}
            {['Booking', 'Pet', 'Invoice', 'Owner'].map(object => {
              const events = eventTriggers.filter(e => e.object === object);
              return (
                <div key={object}>
                  <h3 className="text-xs font-semibold text-muted uppercase mb-2">{object} Events</h3>
                  <div className="space-y-1">
                    {events.map(event => (
                      <button
                        key={event.id}
                        onClick={() => handleEventSelect(event)}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded border border-border',
                          'hover:border-primary hover:bg-primary/5',
                          'transition-colors cursor-pointer'
                        )}
                      >
                        <div className="text-sm font-medium text-text">{event.label}</div>
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
};

export default TriggerSelector;
