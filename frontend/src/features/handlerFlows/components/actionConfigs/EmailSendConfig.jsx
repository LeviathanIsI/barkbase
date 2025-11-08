import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const EmailSendConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [mode, setMode] = useState(config?.to?.mode || 'owner');
  const [emails, setEmails] = useState((config?.to?.emails || []).join(', '));
  const [templateId, setTemplateId] = useState(config?.templateId || '');
  const [subject, setSubject] = useState(config?.subject || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const emailList = mode === 'custom' ? emails.split(',').map(e => e.trim()).filter(Boolean) : undefined;

    const newConfig = {
      to: {
        mode,
        ...(emailList ? { emails: emailList } : {}),
      },
      templateId,
      ...(subject ? { subject } : {}),
    };

    // Validate
    const validationErrors = validateActionConfig('email.send', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'email.send',
      config: newConfig,
      label: node.data.label || 'Send Email',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Send Email Configuration</h3>

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
              <option value="custom">Custom Email(s)</option>
            </select>
          </div>

          {mode === 'custom' && (
            <div>
              <label className="text-xs font-medium text-text mb-1 block">Email Addresses</label>
              <input
                type="text"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
                placeholder="email@example.com, another@example.com"
              />
              <div className="text-xs text-muted mt-1">Separate multiple emails with commas</div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Email Template ID *</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., appt-confirm-v1"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Subject Override (optional)</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="Leave blank to use template default"
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

export default EmailSendConfig;
