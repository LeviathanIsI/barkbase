import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import SettingsPage from '../components/SettingsPage';
import { Mail, MessageSquare, Bell, Smartphone, Globe, Clock } from 'lucide-react';

const CommunicationNotifications = () => {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    
    // Notification types
    bookingConfirmations: true,
    bookingReminders: true,
    checkInReminders: true,
    vaccinationReminders: true,
    paymentReceipts: true,
    marketingEmails: false,
    
    // Timing
    reminderDays: 2,
    quietHoursStart: '21:00',
    quietHoursEnd: '08:00',
    
    // Templates
    useCustomTemplates: false,
    includePhotos: true
  });

  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');

  const handleSave = async () => {
    try {
      const response = await fetch('/api/v1/settings/communication', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        alert('Communication settings saved successfully!');
      } else {
        alert('Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving communication settings:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const sendTestMessage = (type) => {
    if (type === 'email' && !testEmail) {
      alert('Please enter an email address');
      return;
    }
    if (type === 'sms' && !testPhone) {
      alert('Please enter a phone number');
      return;
    }
    alert(`Test ${type} sent!`);
  };

  return (
    <SettingsPage 
      title="Communication & Notifications" 
      description="Configure how you communicate with customers"
    >
      {/* Communication Channels */}
      <Card 
        title="Communication Channels" 
        description="Choose how to reach your customers"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium">Email Notifications</h4>
                <p className="text-sm text-gray-600">Send updates via email</p>
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onChange={(checked) => updateSetting('emailNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium">SMS Notifications</h4>
                <p className="text-sm text-gray-600">Send text message updates</p>
                <Badge variant="warning" className="mt-1">Premium Feature</Badge>
              </div>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onChange={(checked) => updateSetting('smsNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-600" />
              <div>
                <h4 className="font-medium">Push Notifications</h4>
                <p className="text-sm text-gray-600">Mobile app notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onChange={(checked) => updateSetting('pushNotifications', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Notification Types */}
      <Card 
        title="Notification Types" 
        description="Choose which events trigger notifications"
      >
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Booking Confirmations</span>
            <Switch
              checked={settings.bookingConfirmations}
              onChange={(checked) => updateSetting('bookingConfirmations', checked)}
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Booking Reminders</span>
            <Switch
              checked={settings.bookingReminders}
              onChange={(checked) => updateSetting('bookingReminders', checked)}
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Check-In Reminders</span>
            <Switch
              checked={settings.checkInReminders}
              onChange={(checked) => updateSetting('checkInReminders', checked)}
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Vaccination Reminders</span>
            <Switch
              checked={settings.vaccinationReminders}
              onChange={(checked) => updateSetting('vaccinationReminders', checked)}
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Payment Receipts</span>
            <Switch
              checked={settings.paymentReceipts}
              onChange={(checked) => updateSetting('paymentReceipts', checked)}
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm font-medium">Marketing Communications</span>
            <Switch
              checked={settings.marketingEmails}
              onChange={(checked) => updateSetting('marketingEmails', checked)}
            />
          </label>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Send reminders
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.reminderDays}
                  onChange={(e) => updateSetting('reminderDays', parseInt(e.target.value))}
                  min="1"
                  max="7"
                  className="w-16 px-2 py-1 border rounded"
                />
                <span className="text-sm text-gray-600">days before appointment</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card 
        title="Quiet Hours" 
        description="Prevent notifications during certain hours"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock className="inline-block w-4 h-4 mr-2" />
              Quiet Hours Start
            </label>
            <input
              type="time"
              value={settings.quietHoursStart}
              onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock className="inline-block w-4 h-4 mr-2" />
              Quiet Hours End
            </label>
            <input
              type="time"
              value={settings.quietHoursEnd}
              onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Non-urgent notifications will be held during quiet hours
        </p>
      </Card>

      {/* Test Messages */}
      <Card 
        title="Test Messages" 
        description="Send test notifications to verify settings"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Test Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <Button onClick={() => sendTestMessage('email')} variant="outline">
                Send Test
              </Button>
            </div>
          </div>

          {settings.smsNotifications && (
            <div>
              <label className="block text-sm font-medium mb-2">Test SMS</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button onClick={() => sendTestMessage('sms')} variant="outline">
                  Send Test
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <Button variant="outline">
            <Globe className="w-4 h-4 mr-2" />
            Preview Templates
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </Card>
    </SettingsPage>
  );
};

export default CommunicationNotifications;