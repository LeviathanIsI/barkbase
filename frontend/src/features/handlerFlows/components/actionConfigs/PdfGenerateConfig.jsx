import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const PdfGenerateConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [templateId, setTemplateId] = useState(config?.templateId || '');
  const [dataPath, setDataPath] = useState(config?.dataPath || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      templateId,
      ...(dataPath ? { dataPath } : {}),
    };

    const validationErrors = validateActionConfig('pdf.generate', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.recordId, {
      actionType: 'pdf.generate',
      config: newConfig,
      label: node.data.label || 'Generate PDF',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Generate PDF Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Template ID *</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., invoice-pdf-template"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Data Path (optional)</label>
            <input
              type="text"
              value={dataPath}
              onChange={(e) => setDataPath(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., invoice"
            />
            <div className="text-xs text-muted mt-1">Dot-path in context to data source</div>
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

export default PdfGenerateConfig;
