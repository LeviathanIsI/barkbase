import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const InvoiceCreateConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [reservationIdSource, setReservationIdSource] = useState(config?.reservationIdSource || 'context');
  const [terms, setTerms] = useState(config?.terms || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      reservationIdSource,
      ...(terms ? { terms } : {}),
    };

    const validationErrors = validateActionConfig('invoice.create', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'invoice.create',
      config: newConfig,
      label: node.data.label || 'Create Invoice',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Create Invoice Configuration</h3>

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
            <label className="text-xs font-medium text-text mb-1 block">Payment Terms (optional)</label>
            <input
              type="text"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., Net 30"
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

export default InvoiceCreateConfig;
