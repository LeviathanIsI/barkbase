import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import SettingsPage from '../components/SettingsPage';
import { Shield, AlertTriangle, CheckCircle, RefreshCw, Database } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';

const DataQuality = () => {
  const tz = useTimezoneUtils();
  const [settings, setSettings] = useState({
    autoCleanup: true,
    duplicateDetection: true,
    dataValidation: true,
    backupFrequency: 'daily',
    retentionPeriod: '90'
  });

  const [qualityStatus] = useState({
    score: 94,
    issues: 3,
    lastCheck: '2024-01-15T10:30:00'
  });

  const handleRunCheck = () => {
    // TODO: Run data quality check
    alert('Running data quality check...');
  };

  const handleSave = () => {
    // TODO: Save settings
    alert('Data quality settings saved!');
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPage 
      title="Data Quality" 
      description="Monitor and maintain the quality of your data"
    >
      {/* Quality Score */}
      <Card 
        title="Data Quality Score" 
        description="Overall health of your database"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <div className="text-3xl font-bold text-green-600">{qualityStatus.score}%</div>
            <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">Quality Score</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <div className="text-3xl font-bold text-yellow-600">{qualityStatus.issues}</div>
            <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">Issues Found</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <div className="text-sm font-medium">
              {tz.formatShortDate(qualityStatus.lastCheck)}
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">Last Check</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant="success">
              <CheckCircle className="w-3 h-3 mr-1" />
              Healthy
            </Badge>
            <Badge variant="warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {qualityStatus.issues} Issues
            </Badge>
          </div>
          <Button onClick={handleRunCheck} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Run Check Now
          </Button>
        </div>
      </Card>

      {/* Data Management Settings */}
      <Card 
        title="Data Management" 
        description="Configure automated data management policies"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Automatic Cleanup</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Remove orphaned records and fix inconsistencies</p>
            </div>
            <Switch
              checked={settings.autoCleanup}
              onChange={(checked) => updateSetting('autoCleanup', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Duplicate Detection</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Automatically detect and flag duplicate entries</p>
            </div>
            <Switch
              checked={settings.duplicateDetection}
              onChange={(checked) => updateSetting('duplicateDetection', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Data Validation</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Validate data integrity on save</p>
            </div>
            <Switch
              checked={settings.dataValidation}
              onChange={(checked) => updateSetting('dataValidation', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Backup Settings */}
      <Card 
        title="Backup & Retention" 
        description="Configure data backup and retention policies"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Database className="inline-block w-4 h-4 mr-2" />
              Backup Frequency
            </label>
            <StyledSelect
              options={[
                { value: 'hourly', label: 'Hourly' },
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
              ]}
              value={settings.backupFrequency}
              onChange={(opt) => updateSetting('backupFrequency', opt?.value || 'daily')}
              isClearable={false}
              isSearchable={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Shield className="inline-block w-4 h-4 mr-2" />
              Data Retention Period
            </label>
            <StyledSelect
              options={[
                { value: '30', label: '30 days' },
                { value: '60', label: '60 days' },
                { value: '90', label: '90 days' },
                { value: '180', label: '180 days' },
                { value: '365', label: '1 year' },
              ]}
              value={settings.retentionPeriod}
              onChange={(opt) => updateSetting('retentionPeriod', opt?.value || '90')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline">
            <Database className="w-4 h-4 mr-2" />
            Backup Now
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default DataQuality;