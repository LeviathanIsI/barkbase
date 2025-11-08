import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const NoteCreateConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [title, setTitle] = useState(config?.title || '');
  const [body, setBody] = useState(config?.body || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      title,
      body,
    };

    // Validate
    const validationErrors = validateActionConfig('note.create', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'note.create',
      config: newConfig,
      label: node.data.label || 'Create Note',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Create Note Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Note Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., Special care instructions"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Note Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="{{pet.name}} requires special attention..."
              rows={5}
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

export default NoteCreateConfig;
