import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const FileGenerateConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [generator, setGenerator] = useState(config?.generator || 'csv');
  const [templateId, setTemplateId] = useState(config?.templateId || '');
  const [dataPath, setDataPath] = useState(config?.dataPath || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      generator,
      ...(templateId ? { templateId } : {}),
      ...(dataPath ? { dataPath } : {}),
    };

    const validationErrors = validateActionConfig('file.generate', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'file.generate',
      config: newConfig,
      label: node.data.label || 'Generate File',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Generate File Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Generator Type *</label>
            <select
              value={generator}
              onChange={(e) => setGenerator(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="csv">CSV</option>
              <option value="docx">DOCX</option>
              <option value="xlsx">XLSX</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Template ID (optional)</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., booking-export"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Data Path (optional)</label>
            <input
              type="text"
              value={dataPath}
              onChange={(e) => setDataPath(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., bookings"
            />
            <div className="text-xs text-muted mt-1">Dot-path in context to data source</div>
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

export default FileGenerateConfig;
