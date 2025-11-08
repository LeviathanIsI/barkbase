import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const OwnerNotifyConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [channel, setChannel] = useState(config?.channel || 'email');
  const [emailTemplateId, setEmailTemplateId] = useState(config?.emailTemplateId || '');
  const [smsMessage, setSmsMessage] = useState(config?.smsMessage || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      channel,
      ...(emailTemplateId ? { emailTemplateId } : {}),
      ...(smsMessage ? { smsMessage } : {}),
    };

    const validationErrors = validateActionConfig('owner.notify', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'owner.notify',
      config: newConfig,
      label: node.data.label || 'Notify Owner',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Notify Owner Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="both">Both Email and SMS</option>
            </select>
          </div>

          {(channel === 'email' || channel === 'both') && (
            <div>
              <label className="text-xs font-medium text-text mb-1 block">Email Template ID</label>
              <input
                type="text"
                value={emailTemplateId}
                onChange={(e) => setEmailTemplateId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
                placeholder="e.g., appointment-reminder"
              />
            </div>
          )}

          {(channel === 'sms' || channel === 'both') && (
            <div>
              <label className="text-xs font-medium text-text mb-1 block">SMS Message</label>
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
                placeholder="Your appointment is confirmed..."
                rows={4}
              />
            </div>
          )}
        </div>

        {errors.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/10 border border-red-500/30 rounded">
            <div className="text-xs font-medium text-red-400 mb-1">Validation Errors:</div>
            <ul className="text-xs text-red-300 list-disc list-inside">
              {errors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border">
        <Button onClick={handleSave} variant="primary" size="sm" className="w-full">
          Save Configuration
        </Button>
      </div>
    </div>
  );
};

export default OwnerNotifyConfig;
