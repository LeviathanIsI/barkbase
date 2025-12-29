import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import StyledSelect from '@/components/ui/StyledSelect';
import Badge from '@/components/ui/Badge';
import SettingsPage from '../components/SettingsPage';
import { Smartphone, Download, QrCode, Bell, Shield, Wifi } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { useTimezoneUtils } from '@/lib/timezone';

const Mobile = () => {
  const tz = useTimezoneUtils();
  const [settings, setSettings] = useState({
    mobileAppEnabled: true,
    offlineMode: true,
    autoSync: true,
    pushNotifications: true,
    biometricAuth: true,
    photoQuality: 'medium',
    dataUsage: 'wifi-preferred',
    cacheSize: 100
  });

  const [appStats] = useState({
    activeUsers: 12,
    totalDownloads: 45,
    lastSyncTime: new Date().toISOString(),
    appVersion: '2.1.0'
  });

  const handleSave = async () => {
    try {
      await apiClient.put('/api/v1/settings/mobile', settings);
      toast.success('Mobile settings saved successfully!');
    } catch (error) {
      console.error('Error saving mobile settings:', error);
      toast.error(error.message || 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const generateQRCode = () => {
    alert('QR Code for mobile app download generated!');
  };

  return (
    <SettingsPage 
      title="Mobile App Settings" 
      description="Configure your mobile application settings"
    >
      {/* App Status */}
      <Card 
        title="Mobile App Status" 
        description="Monitor your mobile app usage"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <Smartphone className="w-8 h-8 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
            <div className="text-2xl font-bold">{appStats.activeUsers}</div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Active Users</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <Download className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold">{appStats.totalDownloads}</div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Total Downloads</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <Shield className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
            <div className="text-lg font-medium">v{appStats.appVersion}</div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Current Version</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
            <Wifi className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <div className="text-sm font-medium">
              {tz.formatTime(appStats.lastSyncTime)}
            </div>
            <p className="text-sm text-gray-600 dark:text-text-secondary">Last Sync</p>
          </div>
        </div>
      </Card>

      {/* Mobile Features */}
      <Card 
        title="Mobile Features" 
        description="Enable or disable mobile app features"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Mobile App Access</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Allow staff to use the mobile app</p>
            </div>
            <Switch
              checked={settings.mobileAppEnabled}
              onChange={(checked) => updateSetting('mobileAppEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Offline Mode</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Allow app to work without internet</p>
            </div>
            <Switch
              checked={settings.offlineMode}
              onChange={(checked) => updateSetting('offlineMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Auto-Sync</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Automatically sync data when online</p>
            </div>
            <Switch
              checked={settings.autoSync}
              onChange={(checked) => updateSetting('autoSync', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Push Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Send notifications to mobile devices</p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onChange={(checked) => updateSetting('pushNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Biometric Authentication</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Use fingerprint or face ID</p>
            </div>
            <Switch
              checked={settings.biometricAuth}
              onChange={(checked) => updateSetting('biometricAuth', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Data Settings */}
      <Card 
        title="Data & Storage" 
        description="Configure data usage and storage settings"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Photo Quality
            </label>
            <StyledSelect
              options={[
                { value: 'low', label: 'Low (Faster uploads)' },
                { value: 'medium', label: 'Medium (Balanced)' },
                { value: 'high', label: 'High (Best quality)' },
              ]}
              value={settings.photoQuality}
              onChange={(opt) => updateSetting('photoQuality', opt?.value || 'medium')}
              isClearable={false}
              isSearchable={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Data Usage
            </label>
            <StyledSelect
              options={[
                { value: 'wifi-only', label: 'Wi-Fi Only' },
                { value: 'wifi-preferred', label: 'Wi-Fi Preferred' },
                { value: 'unrestricted', label: 'Unrestricted' },
              ]}
              value={settings.dataUsage}
              onChange={(opt) => updateSetting('dataUsage', opt?.value || 'wifi-preferred')}
              isClearable={false}
              isSearchable={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Cache Size Limit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.cacheSize}
                onChange={(e) => updateSetting('cacheSize', parseInt(e.target.value))}
                min="50"
                max="500"
                step="50"
                className="w-24 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
              />
              <span className="text-sm text-gray-600 dark:text-text-secondary">MB</span>
            </div>
          </div>
        </div>
      </Card>

      {/* App Distribution */}
      <Card 
        title="App Distribution" 
        description="Share your mobile app with staff"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-surface-primary rounded-lg">
            <div>
              <h4 className="font-medium">Download QR Code</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Generate QR code for easy app download</p>
            </div>
            <Button onClick={generateQRCode} variant="outline">
              <QrCode className="w-4 h-4 mr-2" />
              Generate QR
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="#"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors"
            >
              <Download className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium">Download for iOS</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Available on App Store</p>
              </div>
            </a>
            
            <a
              href="#"
              className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary transition-colors"
            >
              <Download className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium">Download for Android</p>
                <p className="text-sm text-gray-600 dark:text-text-secondary">Available on Google Play</p>
              </div>
            </a>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline">
            <Bell className="w-4 h-4 mr-2" />
            Send App Invite
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default Mobile;