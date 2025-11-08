import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const SegmentAddConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [segmentKey, setSegmentKey] = useState(config?.segmentKey || '');
  const [target, setTarget] = useState(config?.target || 'owner');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      segmentKey,
      target,
    };

    const validationErrors = validateActionConfig('segment.add', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'segment.add',
      config: newConfig,
      label: node.data.label || 'Add to Segment',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Add to Segment Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Segment Key *</label>
            <input
              type="text"
              value={segmentKey}
              onChange={(e) => setSegmentKey(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., vip-clients"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Target Object *</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="owner">Owner</option>
              <option value="pet">Pet</option>
              <option value="reservation">Reservation</option>
            </select>
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

export default SegmentAddConfig;
