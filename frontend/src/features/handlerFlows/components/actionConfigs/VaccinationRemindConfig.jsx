import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const VaccinationRemindConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [petIdSource, setPetIdSource] = useState(config?.petIdSource || 'context');
  const [vaccines, setVaccines] = useState((config?.vaccines || []).join(', '));
  const [channel, setChannel] = useState(config?.channel || 'email');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const vaccineList = vaccines.split(',').map(v => v.trim()).filter(Boolean);

    const newConfig = {
      petIdSource,
      vaccines: vaccineList,
      channel,
    };

    const validationErrors = validateActionConfig('vaccination.remind', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.id, {
      actionType: 'vaccination.remind',
      config: newConfig,
      label: node.data.label || 'Send Vaccination Reminder',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Vaccination Reminder Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Pet ID Source</label>
            <select
              value={petIdSource}
              onChange={(e) => setPetIdSource(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="context">From Context</option>
              <option value="lookup">Custom Lookup</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Vaccines *</label>
            <input
              type="text"
              value={vaccines}
              onChange={(e) => setVaccines(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="rabies, bordetella, distemper"
            />
            <div className="text-xs text-muted mt-1">Separate multiple vaccines with commas</div>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Channel *</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="both">Both Email and SMS</option>
            </select>
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

export default VaccinationRemindConfig;
