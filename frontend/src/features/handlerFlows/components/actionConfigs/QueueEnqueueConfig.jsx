import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const QueueEnqueueConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [queue, setQueue] = useState(config?.queue || '');
  const [payload, setPayload] = useState(JSON.stringify(config?.payload || {}, null, 2));
  const [delayMs, setDelayMs] = useState(config?.delayMs || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    let parsedPayload = {};

    try {
      parsedPayload = payload.trim() ? JSON.parse(payload) : {};
    } catch (e) {
      setErrors(['Payload must be valid JSON']);
      return;
    }

    const newConfig = {
      queue,
      ...(Object.keys(parsedPayload).length > 0 ? { payload: parsedPayload } : {}),
      ...(delayMs ? { delayMs: parseInt(delayMs) } : {}),
    };

    const validationErrors = validateActionConfig('queue.enqueue', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.id, {
      actionType: 'queue.enqueue',
      config: newConfig,
      label: node.data.label || 'Enqueue Job',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Enqueue Job Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Queue Name *</label>
            <input
              type="text"
              value={queue}
              onChange={(e) => setQueue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., email-batch-sender"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Payload (JSON, optional)</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
              rows={6}
              placeholder={'{\n  "batchId": "123",\n  "recipients": 500\n}'}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Delay (ms, optional)</label>
            <input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="60000"
              min="0"
            />
            <div className="text-xs text-muted mt-1">Delay before processing in milliseconds</div>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded">
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

export default QueueEnqueueConfig;
