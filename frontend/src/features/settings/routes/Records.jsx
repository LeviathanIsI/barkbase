import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import SettingsPage from '../components/SettingsPage';
import { FileText, Lock, Download, Archive, Clock, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { useTimezoneUtils } from '@/lib/timezone';

const Records = () => {
  const tz = useTimezoneUtils();
  const [settings, setSettings] = useState({
    autoArchive: true,
    archiveAfterDays: 365,
    recordRetention: 'seven-years',
    encryptRecords: true,
    auditTrail: true,
    recordVersioning: true,
    requireApproval: false,
    backupEnabled: true,
    backupFrequency: 'daily'
  });

  const [recordStats] = useState({
    totalRecords: 12543,
    archivedRecords: 3421,
    storageUsed: '2.3 GB',
    lastBackup: new Date().toISOString()
  });

  const handleSave = async () => {
    try {
      await apiClient.put('/api/v1/settings/records', settings);
      toast.success('Records settings saved successfully!');
    } catch (error) {
      console.error('Error saving records settings:', error);
      toast.error(error.message || 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPage 
      title="Records Management" 
      description="Configure how records are stored and managed"
    >
      {/* Records Overview */}
      <Card 
        title="Records Overview" 
        description="Current records statistics"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <div className="text-2xl font-bold">{recordStats.totalRecords.toLocaleString()}</div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Total Records</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <Archive className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <div className="text-2xl font-bold">{recordStats.archivedRecords.toLocaleString()}</div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Archived</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <Download className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-lg font-medium">{recordStats.storageUsed}</div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Storage Used</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <Clock className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <div className="text-sm font-medium">
              {tz.formatShortDate(recordStats.lastBackup)}
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Last Backup</p>
          </div>
        </div>
      </Card>

      {/* Retention Policies */}
      <Card 
        title="Retention Policies" 
        description="Set how long records are kept"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Automatic Archival</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Archive old records automatically</p>
            </div>
            <Switch
              checked={settings.autoArchive}
              onChange={(checked) => updateSetting('autoArchive', checked)}
            />
          </div>

          {settings.autoArchive && (
            <div className="ml-8">
              <label className="block text-sm font-medium mb-2">
                Archive records after
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.archiveAfterDays}
                  onChange={(e) => updateSetting('archiveAfterDays', parseInt(e.target.value))}
                  min="30"
                  max="1095"
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
                <span className="text-sm text-gray-600 dark:text-text-secondary">days</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Record Retention Period
            </label>
            <Select
              value={settings.recordRetention}
              onChange={(e) => updateSetting('recordRetention', e.target.value)}
              options={[
                { value: 'one-year', label: '1 Year' },
                { value: 'three-years', label: '3 Years' },
                { value: 'five-years', label: '5 Years' },
                { value: 'seven-years', label: '7 Years' },
                { value: 'indefinite', label: 'Indefinite' },
              ]}
              menuPortalTarget={document.body}
            />
            <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">
              Medical records may have legal retention requirements
            </p>
          </div>
        </div>
      </Card>

      {/* Security & Compliance */}
      <Card 
        title="Security & Compliance" 
        description="Protect and track record access"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Encrypt Records</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Use encryption for stored records</p>
            </div>
            <Switch
              checked={settings.encryptRecords}
              onChange={(checked) => updateSetting('encryptRecords', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Audit Trail</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Track all record access and changes</p>
            </div>
            <Switch
              checked={settings.auditTrail}
              onChange={(checked) => updateSetting('auditTrail', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Version Control</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Keep history of record changes</p>
            </div>
            <Switch
              checked={settings.recordVersioning}
              onChange={(checked) => updateSetting('recordVersioning', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Require Approval</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Changes require manager approval</p>
              <Badge variant="warning" className="mt-1">Premium</Badge>
            </div>
            <Switch
              checked={settings.requireApproval}
              onChange={(checked) => updateSetting('requireApproval', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Backup Settings */}
      <Card 
        title="Backup Configuration" 
        description="Configure automatic backups"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Automatic Backups</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Regularly backup all records</p>
            </div>
            <Switch
              checked={settings.backupEnabled}
              onChange={(checked) => updateSetting('backupEnabled', checked)}
            />
          </div>

          {settings.backupEnabled && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Backup Frequency
              </label>
              <Select
                value={settings.backupFrequency}
                onChange={(e) => updateSetting('backupFrequency', e.target.value)}
                options={[
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                menuPortalTarget={document.body}
              />
            </div>
          )}

          <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-md p-3">
            <div className="flex">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">HIPAA Compliance</p>
                <p className="mt-1">
                  Your records management settings meet HIPAA requirements for 
                  medical record retention and security.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Audit Log
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Records;