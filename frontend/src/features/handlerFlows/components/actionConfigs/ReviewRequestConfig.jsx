import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const ReviewRequestConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [mode, setMode] = useState(config?.to?.mode || 'owner');
  const [emails, setEmails] = useState((config?.to?.emails || []).join(', '));
  const [provider, setProvider] = useState(config?.provider || 'google');
  const [templateId, setTemplateId] = useState(config?.templateId || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const emailList = mode === 'custom' ? emails.split(',').map(e => e.trim()).filter(Boolean) : undefined;

    const newConfig = {
      to: {
        mode,
        ...(emailList ? { emails: emailList } : {}),
      },
      provider,
      ...(templateId ? { templateId } : {}),
    };

    const validationErrors = validateActionConfig('review.request', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'review.request',
      config: newConfig,
      label: node.data.label || 'Request Review',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Request Review Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Send to</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="owner">Pet Owner</option>
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
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Review Provider *</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="google">Google</option>
              <option value="yelp">Yelp</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Template ID (optional)</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., review-request-v1"
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

export default ReviewRequestConfig;
