import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const PrintDocumentConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [templateId, setTemplateId] = useState(config?.templateId || '');
  const [copies, setCopies] = useState(config?.copies || 1);
  const [printerId, setPrinterId] = useState(config?.printerId || '');
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    const newConfig = {
      templateId,
      copies: parseInt(copies),
      ...(printerId ? { printerId } : {}),
    };

    const validationErrors = validateActionConfig('print.document', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.id, {
      actionType: 'print.document',
      config: newConfig,
      label: node.data.label || 'Print Document',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">Print Document Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">Template ID *</label>
            <input
              type="text"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., receipt-template"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Number of Copies *</label>
            <input
              type="number"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              min="1"
              max="10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Printer ID (optional)</label>
            <input
              type="text"
              value={printerId}
              onChange={(e) => setPrinterId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
              placeholder="e.g., reception-printer-01"
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

export default PrintDocumentConfig;
