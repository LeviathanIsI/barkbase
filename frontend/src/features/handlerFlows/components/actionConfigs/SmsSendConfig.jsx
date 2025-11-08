import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const SmsSendConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [mode, setMode] = useState(config?.to?.mode || 'owner');
  const [phones, setPhones] = useState((config?.to?.phones || []).join(', '));
  const [message, setMessage] = useState(config?.message || '');
  const [senderId, setSenderId] = useState(config?.senderId || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const phoneList = mode === 'custom' ? phones.split(',').map(p => p.trim()).filter(Boolean) : undefined;

    const newConfig = {
      to: {
        mode,
        ...(phoneList ? { phones: phoneList } : {}),
      },
      message,
      ...(senderId ? { senderId } : {}),
    };

    // Validate
    const validationErrors = validateActionConfig('sms.send', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'sms.send',
      config: newConfig,
      label: node.data.label || 'Send SMS',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Send SMS Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Send to</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="owner">Pet Owner</option>
              <option value="contact">Emergency Contact</option>
              <option value="custom">Custom Phone Number(s)</option>
            </select>
          </div>

          {mode === 'custom' && (
            <div>
              <label className="text-xs font-medium text-text mb-1 block">Phone Numbers</label>
              <input
                type="text"
                value={phones}
                onChange={(e) => setPhones(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
                placeholder="+1234567890, +0987654321"
              />
              <div className="text-xs text-muted mt-1">Separate multiple numbers with commas</div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
              placeholder="Hi {{owner.firstName}}, your appointment is confirmed..."
              rows={4}
            />
            <div className="text-xs text-muted mt-1">
              Character count: {message.length} / 160
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Sender ID (optional)</label>
            <input
              type="text"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., BARKBASE"
            />
          </div>
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

export default SmsSendConfig;
