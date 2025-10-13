import { useState } from 'react';
import Button from '@/components/ui/Button';
import { validateActionConfig } from '../../utils/validateDefinition';

const HttpWebhookConfig = ({ node, onUpdate }) => {
  const config = node?.data?.config || {};

  const [method, setMethod] = useState(config?.method || 'POST');
  const [url, setUrl] = useState(config?.url || '');
  const [headers, setHeaders] = useState(JSON.stringify(config?.headers || {}, null, 2));
  const [body, setBody] = useState(JSON.stringify(config?.body || {}, null, 2));
  const [errors, setErrors] = useState([]);

  const handleSave = () => {
    let parsedHeaders = {};
    let parsedBody = {};

    try {
      parsedHeaders = headers.trim() ? JSON.parse(headers) : {};
    } catch (e) {
      setErrors(['Headers must be valid JSON']);
      return;
    }

    try {
      parsedBody = body.trim() ? JSON.parse(body) : {};
    } catch (e) {
      setErrors(['Body must be valid JSON']);
      return;
    }

    const newConfig = {
      method,
      url,
      ...(Object.keys(parsedHeaders).length > 0 ? { headers: parsedHeaders } : {}),
      ...(Object.keys(parsedBody).length > 0 ? { body: parsedBody } : {}),
    };

    // Validate
    const validationErrors = validateActionConfig('http.webhook', newConfig);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onUpdate(node.id, {
      actionType: 'http.webhook',
      config: newConfig,
      label: node.data.label || 'Send Webhook',
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text mb-3">HTTP Webhook Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text mb-1 block">URL *</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
              placeholder="https://api.example.com/webhook"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Method *</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Headers (JSON, optional)</label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
              rows={4}
              placeholder={'{\n  "Authorization": "Bearer token",\n  "Content-Type": "application/json"\n}'}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text mb-1 block">Body (JSON, optional)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded bg-background text-text font-mono"
              rows={6}
              placeholder={'{\n  "event": "booking.created",\n  "petName": "{{pet.name}}"\n}'}
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

export default HttpWebhookConfig;
