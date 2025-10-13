import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const TaskCreateConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [title, setTitle] = useState(config?.title || '');
  const [description, setDescription] = useState(config?.description || '');
  const [assigneeUserId, setAssigneeUserId] = useState(config?.assigneeUserId || '');
  const [dueInHours, setDueInHours] = useState(config?.dueInHours || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      title,
      ...(description ? { description } : {}),
      ...(assigneeUserId ? { assigneeUserId } : {}),
      ...(dueInHours ? { dueInHours: parseInt(dueInHours) } : {}),
    };

    // Validate
    const validationErrors = validateActionConfig('task.create', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.id, {
      actionType: 'task.create',
      config: newConfig,
      label: node.data.label || 'Create Task',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Create Task Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., Follow up with client"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="Additional details about the task..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Assign To (optional)</label>
            <input
              type="text"
              value={assigneeUserId}
              onChange={(e) => setAssigneeUserId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="User ID"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Due In Hours (optional)</label>
            <input
              type="number"
              value={dueInHours}
              onChange={(e) => setDueInHours(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="24"
              min="1"
            />
            <div className="text-xs text-muted mt-1">Hours from now when task is due</div>
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

export default TaskCreateConfig;
