import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const TeamNotifyConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [users, setUsers] = useState((config?.users || []).join(', '));
  const [roles, setRoles] = useState((config?.roles || []).join(', '));
  const [channel, setChannel] = useState(config?.channel || 'inapp');
  const [message, setMessage] = useState(config?.message || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const userList = users.split(',').map(u => u.trim()).filter(Boolean);
    const roleList = roles.split(',').map(r => r.trim()).filter(Boolean);

    const newConfig = {
      ...(userList.length > 0 ? { users: userList } : {}),
      ...(roleList.length > 0 ? { roles: roleList } : {}),
      channel,
      message,
    };

    const validationErrors = validateActionConfig('team.notify', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.id, {
      actionType: 'team.notify',
      config: newConfig,
      label: node.data.label || 'Notify Team',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Notify Team Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">User IDs (optional)</label>
            <input
              type="text"
              value={users}
              onChange={(e) => setUsers(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="userId1, userId2"
            />
            <div className="text-xs text-muted mt-1">Separate multiple user IDs with commas</div>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Role Keys (optional)</label>
            <input
              type="text"
              value={roles}
              onChange={(e) => setRoles(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="staff, manager"
            />
            <div className="text-xs text-muted mt-1">At least one of users or roles must be specified</div>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="inapp">In-App</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="New booking requires immediate attention"
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

export default TeamNotifyConfig;
