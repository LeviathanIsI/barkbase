import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const FeeAddConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [reservationIdSource, setReservationIdSource] = useState(config?.reservationIdSource || 'context');
  const [amount, setAmount] = useState(config?.amount || '');
  const [code, setCode] = useState(config?.code || '');
  const [reason, setReason] = useState(config?.reason || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      reservationIdSource,
      amount: parseFloat(amount),
      ...(code ? { code } : {}),
      ...(reason ? { reason } : {}),
    };

    const validationErrors = validateActionConfig('fee.add', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'fee.add',
      config: newConfig,
      label: node.data.label || 'Add Fee',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Add Fee Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Reservation Source *</label>
            <select
              value={reservationIdSource}
              onChange={(e) => setReservationIdSource(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="context">From Context</option>
              <option value="latest">Latest for Owner</option>
              <option value="lookup">Custom Lookup</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Fee Amount *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="25.00"
              step="0.01"
              min="0.01"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Fee Code (optional)</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., LATE_CHECKIN"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Reason (optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., Late check-in fee"
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

export default FeeAddConfig;
