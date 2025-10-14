import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const StatusUpdateConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [object, setObject] = useState(config?.object || 'reservation');
  const [status, setStatus] = useState(config?.status || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      object,
      status,
    };

    const validationErrors = validateActionConfig('status.update', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'status.update',
      config: newConfig,
      label: node.data.label || 'Update Status',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Update Status Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Object *</label>
            <select
              value={object}
              onChange={(e) => setObject(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="owner">Owner</option>
              <option value="pet">Pet</option>
              <option value="reservation">Reservation</option>
              <option value="invoice">Invoice</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">New Status *</label>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., confirmed"
            />
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

export default StatusUpdateConfig;
