import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import SettingsPage from '../components/SettingsPage';
import { useTenantStore } from '@/stores/tenant';
import apiClient from '@/lib/apiClient';
import { defaultLabels } from '@/lib/terminology';
import { RotateCcw, Save } from 'lucide-react';

const Terminology = () => {
  const tenant = useTenantStore((state) => state.tenant);
  const setTerminology = useTenantStore((state) => state.setTerminology);
  const [customLabels, setCustomLabels] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize with tenant's current terminology
  useEffect(() => {
    setCustomLabels(tenant?.terminology || {});
  }, [tenant?.terminology]);

  // Check for changes
  useEffect(() => {
    const originalTerminology = tenant?.terminology || {};
    const hasAnyChange = Object.keys(defaultLabels).some(
      (key) => (customLabels[key] || '') !== (originalTerminology[key] || '')
    );
    setHasChanges(hasAnyChange);
  }, [customLabels, tenant?.terminology]);

  const handleLabelChange = (key, value) => {
    setCustomLabels((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReset = (key) => {
    setCustomLabels((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleResetAll = () => {
    setCustomLabels({});
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Filter out empty values (use defaults)
      const cleanedTerminology = {};
      for (const [key, value] of Object.entries(customLabels)) {
        if (value && value.trim() && value.trim() !== defaultLabels[key]) {
          cleanedTerminology[key] = value.trim();
        }
      }

      // Save to backend
      await apiClient.put('/api/v1/config/tenant', {
        settings: {
          terminology: cleanedTerminology,
        },
      });

      // Update local store immediately for instant sidebar update
      setTerminology(cleanedTerminology);

      toast.success('Terminology saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save terminology:', error);
      toast.error('Failed to save terminology');
    } finally {
      setIsSaving(false);
    }
  };

  // Order the labels logically by section
  const labelOrder = [
    'commandCenter',
    'owners',
    'pets',
    'vaccinations',
    'bookings',
    'runSchedules',
    'kennels',
    'incidents',
    'messages',
    'packages',
  ];

  return (
    <SettingsPage
      title="Terminology"
      description="Customize navigation labels to match your business terminology"
    >
      <Card
        title="Navigation Labels"
        description="Customize how navigation items appear in your sidebar. Changes apply immediately after saving."
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--bb-color-border-secondary)' }}>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  Default Label
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  Custom Label
                </th>
                <th className="w-20 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {labelOrder.map((key) => {
                const defaultLabel = defaultLabels[key];
                const customValue = customLabels[key] || '';
                const isModified = customValue && customValue !== defaultLabel;

                return (
                  <tr
                    key={key}
                    className="border-b transition-colors hover:bg-[color:var(--bb-color-surface-secondary)]"
                    style={{ borderColor: 'var(--bb-color-border-secondary)' }}
                  >
                    <td className="py-3 px-4">
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--bb-color-text-secondary)' }}
                      >
                        {defaultLabel}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Input
                        value={customValue}
                        onChange={(e) => handleLabelChange(key, e.target.value)}
                        placeholder={defaultLabel}
                        className="max-w-xs"
                      />
                    </td>
                    <td className="py-3 px-4">
                      {isModified && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReset(key)}
                          title="Reset to default"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div
          className="flex justify-between items-center pt-4 mt-4 border-t"
          style={{ borderColor: 'var(--bb-color-border-secondary)' }}
        >
          <Button
            variant="outline"
            onClick={handleResetAll}
            disabled={Object.keys(customLabels).length === 0}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Terminology;
