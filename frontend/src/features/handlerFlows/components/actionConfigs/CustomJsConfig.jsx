import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const CustomJsConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [code, setCode] = useState(config?.code || '');
  const [timeoutMs, setTimeoutMs] = useState(config?.timeoutMs || 5000);
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      code,
      ...(timeoutMs ? { timeoutMs: parseInt(timeoutMs) } : {}),
    };

    const validationErrors = validateActionConfig('custom.js', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'custom.js',
      config: newConfig,
      label: node.data.label || 'Custom JavaScript',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Custom JavaScript Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">JavaScript Code *</label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
              rows={12}
              placeholder={`const totalAmount = context.invoice.total;
if (totalAmount > 1000) {
  setContext({ requiresApproval: true });
}
return { calculated: totalAmount * 0.1 };`}
            />
            <div className="text-xs text-muted mt-1">
              Available: context, console, fetch, setContext(updates)
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Timeout (ms)</label>
            <input
              type="number"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="5000"
              min="1000"
              max="30000"
            />
            <div className="text-xs text-muted mt-1">Execution timeout in milliseconds (default: 5000)</div>
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

export default CustomJsConfig;
