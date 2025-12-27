import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Select from '@/components/ui/Select';
import SettingsPage from '../components/SettingsPage';
import { Mail, Calendar, FileText, Download, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

const Reporting = () => {
  const [settings, setSettings] = useState({
    dailyReport: true,
    weeklyReport: false,
    monthlyReport: true,
    reportTime: '08:00',
    reportEmail: 'reports@example.com',
    includeCharts: true,
    includeDetails: true,
    format: 'pdf'
  });

  const handleSave = async () => {
    try {
      await apiClient.put('/api/v1/settings/reporting', settings);
      toast.success('Report settings saved successfully!');
    } catch (error) {
      console.error('Error saving report settings:', error);
      toast.error(error.message || 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPage 
      title="Reporting Settings" 
      description="Configure automated reports and analytics"
    >
      {/* Report Schedule */}
      <Card 
        title="Report Schedule" 
        description="Set up when and how often reports are generated"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Daily Summary Report</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Receive daily activity summary</p>
            </div>
            <Switch
              checked={settings.dailyReport}
              onChange={(checked) => updateSetting('dailyReport', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Weekly Analytics Report</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Comprehensive weekly business metrics</p>
            </div>
            <Switch
              checked={settings.weeklyReport}
              onChange={(checked) => updateSetting('weeklyReport', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Monthly Financial Report</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Monthly revenue and expense breakdown</p>
            </div>
            <Switch
              checked={settings.monthlyReport}
              onChange={(checked) => updateSetting('monthlyReport', checked)}
            />
          </div>

          <div className="pt-4 border-t">
            <label className="block text-sm font-medium mb-2">
              <Clock className="inline-block w-4 h-4 mr-2" />
              Report Delivery Time
            </label>
            <input
              type="time"
              value={settings.reportTime}
              onChange={(e) => updateSetting('reportTime', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
            />
          </div>
        </div>
      </Card>

      {/* Report Settings */}
      <Card 
        title="Report Settings" 
        description="Configure report format and content"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Mail className="inline-block w-4 h-4 mr-2" />
              Email Reports To
            </label>
            <input
              type="email"
              value={settings.reportEmail}
              onChange={(e) => updateSetting('reportEmail', e.target.value)}
              placeholder="reports@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <FileText className="inline-block w-4 h-4 mr-2" />
              Report Format
            </label>
            <Select
              value={settings.format}
              onChange={(e) => updateSetting('format', e.target.value)}
              options={[
                { value: 'pdf', label: 'PDF Document' },
                { value: 'excel', label: 'Excel Spreadsheet' },
                { value: 'csv', label: 'CSV File' },
              ]}
              menuPortalTarget={document.body}
            />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Report Content</h4>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.includeCharts}
                onChange={(e) => updateSetting('includeCharts', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Include charts and graphs</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.includeDetails}
                onChange={(e) => updateSetting('includeDetails', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Include detailed transaction logs</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Current Settings
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Reporting;