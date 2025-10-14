import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { cn } from '@/lib/cn';

const randomId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export const buildFlowPayload = ({ name, eventType, delay, email }) => {
  const conditionId = randomId();
  const delayId = randomId();
  const emailId = randomId();

  return {
    name,
    trigger: {
      type: 'event',
      config: { event: eventType },
    },
    definition: {
      entryStepId: conditionId,
      version: 1,
    },
    steps: [
      { recordId: conditionId,
        kind: 'condition',
        name: 'Check booking total',
        config: {
          logic: { '>': [{ var: 'payload.booking.total' }, 0] },
        },
        nextId: delayId,
        altNextId: null,
      },
      { recordId: delayId,
        kind: 'delay',
        name: `Wait ${delay}`,
        config: {
          duration: delay,
        },
        nextId: emailId,
        altNextId: null,
      },
      { recordId: emailId,
        kind: 'action',
        name: 'Send confirmation email',
        config: {
          actionType: 'email.send',
          to: email,
          subject: 'Thanks for booking with BarkBase',
          text: 'We appreciate your business! This message was automated by Handler Flows.',
        },
        nextId: null,
        altNextId: null,
      },
    ],
  };
};

export const DEFAULT_FLOW_FORM = Object.freeze({
  name: 'Booking confirmation',
  eventType: 'booking.created',
  delay: 'PT1M',
  email: '',
});

export const DELAY_OPTIONS = Object.freeze([
  { value: 'PT1M', label: '1 minute' },
  { value: 'PT5M', label: '5 minutes' },
  { value: 'PT1H', label: '1 hour' },
  { value: 'P1D', label: '1 day' },
]);

export const EVENT_OPTIONS = Object.freeze([
  { value: 'booking.created', label: 'Booking created' },
  { value: 'booking.updated', label: 'Booking updated' },
  { value: 'pet.vaccine.expiring', label: 'Pet vaccine expiring' },
]);

const HandlerFlowForm = ({ onSubmit, isSubmitting, value, onChange }) => {
  const [form, setForm] = useState(value ?? DEFAULT_FLOW_FORM);

  useEffect(() => {
    if (value) {
      setForm(value);
    }
  }, [value]);

  const commit = (next) => {
    setForm(next);
    onChange?.(next);
  };

  const handleChange = (key) => (event) => {
    const { value: fieldValue } = event.target;
    commit({ ...form, [key]: fieldValue });
  };

  const submit = (event) => {
    event.preventDefault();
    const payload = buildFlowPayload(form);
    onSubmit?.(payload, form);
  };

  return (
    <Card
      title="Create automation"
      description="Generate a starter handler flow with a trigger, condition, delay, and email action."
      className="shadow-none"
    >
      <form className="space-y-4" onSubmit={submit}>
        <Input label="Flow name" value={form.name} onChange={handleChange('name')} required />
        <Select label="Trigger event" value={form.eventType} onChange={handleChange('eventType')}>
          {EVENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select label="Delay before email" value={form.delay} onChange={handleChange('delay')}>
          {DELAY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          label="Email recipient"
          value={form.email}
          onChange={handleChange('email')}
          type="email"
          placeholder="owner@example.com"
          helper="Leave blank to use the owner email from the event payload."
        />
        <div className={cn('pt-2')}>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create flow'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default HandlerFlowForm;
