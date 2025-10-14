import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const ReservationCreateConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [ownerIdSource, setOwnerIdSource] = useState(config?.ownerIdSource || 'context');
  const [petIdsSource, setPetIdsSource] = useState(config?.petIdsSource || 'context');
  const [start, setStart] = useState(config?.start || '');
  const [end, setEnd] = useState(config?.end || '');
  const [notes, setNotes] = useState(config?.notes || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      ownerIdSource,
      petIdsSource,
      start,
      end,
      ...(notes ? { notes } : {}),
    };

    const validationErrors = validateActionConfig('reservation.create', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'reservation.create',
      config: newConfig,
      label: node.data.label || 'Create Reservation',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Create Reservation Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Owner ID Source *</label>
            <select
              value={ownerIdSource}
              onChange={(e) => setOwnerIdSource(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="context">From Context</option>
              <option value="lookup">Custom Lookup</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Pet IDs Source</label>
            <select
              value={petIdsSource}
              onChange={(e) => setPetIdsSource(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="context">From Context</option>
              <option value="lookup">Custom Lookup</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Start Date/Time *</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">End Date/Time *</label>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="Additional notes..."
              rows={3}
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

export default ReservationCreateConfig;
