import { useState } from 'react';
import { Key, Plus, Eye, RotateCcw, Trash2, Copy, Download, AlertTriangle } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import Card from '@/components/ui/card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

const APIKeys = () => {
  const tz = useTimezoneUtils();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null);

  // Mock API keys data
  const apiKeys = [
    {
      id: 1,
      name: 'Production Key',
      key: 'sk_live_••••••••••••••••1234',
      fullKey: 'sk_live_ab3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z',
      permissions: 'Read + Write',
      createdAt: 'Jan 1, 2025',
      lastUsed: '2 hours ago',
      status: 'active'
    }
  ];

  const handleCreateKey = () => {
    setShowCreateModal(true);
  };

  const handleSubmitNewKey = (formData) => {
    // Mock new key creation
    const newKey = {
      name: formData.name,
      key: `sk_live_${Math.random().toString(36).substring(2, 15)}`,
      permissions: formData.permissions === 'readwrite' ? 'Read + Write' : 'Read Only',
      createdAt: tz.formatShortDate(new Date()),
      lastUsed: 'Never',
      status: 'active'
    };
    setNewKeyData(newKey);
    setShowCreateModal(false);
    setShowNewKeyModal(true);
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    // TODO: Show toast notification
  };

  return (
    <>
      <Card title="API Keys & Access Tokens" icon={Key}>
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">Keep these secret!</h4>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Anyone with your API key can access your data. Store them securely and never share them publicly.
                </p>
              </div>
            </div>
          </div>

          {/* Active API Keys */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">ACTIVE API KEYS</h3>
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.id} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 dark:text-text-primary">{key.name}</h4>
                    <Badge variant="success">Active</Badge>
                  </div>

                  <div className="font-mono text-sm bg-gray-50 dark:bg-surface-secondary p-2 rounded border mb-3">
                    {key.key}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-500 dark:text-text-secondary">Permissions:</span>
                      <div className="font-medium">{key.permissions}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-text-secondary">Created:</span>
                      <div className="font-medium">{key.createdAt}</div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-text-secondary">Last used:</span>
                      <div className="font-medium">{key.lastUsed}</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Regenerate
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600">
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Create New Key */}
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-surface-border rounded-lg">
            <Key className="w-12 h-12 text-gray-400 dark:text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-text-primary mb-2">Create New API Key</h3>
            <p className="text-gray-600 dark:text-text-secondary mb-4">
              Generate a new API key for programmatic access to your account.
            </p>
            <Button onClick={handleCreateKey}>
              <Plus className="w-4 h-4 mr-2" />
              Create New API Key
            </Button>
          </div>
        </div>
      </Card>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-surface-border">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">Create API Key</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  placeholder="Production Integration"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                  Permissions *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input type="radio" name="permissions" value="readonly" defaultChecked />
                    <div>
                      <div className="font-medium">Read Only</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">View data only</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="radio" name="permissions" value="readwrite" />
                    <div>
                      <div className="font-medium">Read + Write</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">Create and modify</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                  Expiration
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input type="radio" name="expiration" value="never" />
                    <div>
                      <div className="font-medium">Never</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary text-red-600">Not recommended</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="radio" name="expiration" value="1year" defaultChecked />
                    <div>
                      <div className="font-medium">1 year from now</div>
                      <div className="text-sm text-gray-600 dark:text-text-secondary">Recommended for security</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3">
                    <input type="radio" name="expiration" value="custom" />
                    <div className="flex-1">
                      <div className="font-medium">Custom date</div>
                      <input
                        type="date"
                        className="mt-1 px-2 py-1 border border-gray-300 dark:border-surface-border rounded text-sm"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-1">
                  IP Restrictions (optional)
                </label>
                <input
                  type="text"
                  placeholder="192.168.1.0/24"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
                  Leave blank to allow any IP
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSubmitNewKey({ name: 'Test Key', permissions: 'readwrite' })}>
                Create Key
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Key Created Modal */}
      {showNewKeyModal && newKeyData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-surface-border">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-text-primary">🔑 Your New API Key</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Save this now!</strong> You won't be able to see it again.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
                  API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyData.key}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md bg-gray-50 dark:bg-surface-secondary font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => handleCopyKey(newKeyData.key)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-text-secondary">Name:</span>
                  <div className="font-medium">{newKeyData.name}</div>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-text-secondary">Permissions:</span>
                  <div className="font-medium">{newKeyData.permissions}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-surface-border">
              <Button variant="outline" onClick={() => setShowNewKeyModal(false)}>
                <Download className="w-4 h-4 mr-2" />
                Download as File
              </Button>
              <Button onClick={() => setShowNewKeyModal(false)}>
                I've Saved My Key
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default APIKeys;
