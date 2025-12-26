import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import Badge from '@/components/ui/Badge';
import { Mail, MessageSquare, Smartphone, Globe, Clock, AlertTriangle, Loader2, ExternalLink, Info, Send, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  useNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  useSendTestNotificationMutation,
} from '../api';

const CommunicationNotifications = () => {
  // Local state for form (synced from server)
  const [settings, setSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: false,
    bookingConfirmations: true,
    bookingReminders: true,
    checkinReminders: true,
    vaccinationReminders: true,
    paymentReceipts: true,
    marketingEnabled: false,
    reminderDaysBefore: 2,
    quietHoursStart: '21:00',
    quietHoursEnd: '08:00',
    useCustomTemplates: false,
    includePhotosInUpdates: true,
  });

  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // API hooks
  const { data, isLoading, isError, error } = useNotificationSettingsQuery();
  const updateMutation = useUpdateNotificationSettingsMutation();
  const sendTestMutation = useSendTestNotificationMutation();

  // Sync server data to local state
  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings);
      setHasChanges(false);
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(settings);
      toast.success('Communication settings saved successfully!');
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving communication settings:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const sendTestMessage = async (type) => {
    if (type === 'email') {
      if (!testEmail) {
        toast.error('Please enter an email address');
        return;
      }

      try {
        const result = await sendTestMutation.mutateAsync({ type: 'email', email: testEmail });
        toast.success(result.message || `Test email sent to ${testEmail}`);
      } catch (err) {
        console.error('Error sending test email:', err);
        toast.error(err.response?.data?.message || 'Failed to send test email');
      }
    }

    if (type === 'sms') {
      if (!testPhone) {
        toast.error('Please enter a phone number');
        return;
      }

      try {
        const result = await sendTestMutation.mutateAsync({ type: 'sms', phone: testPhone });

        if (result.requiresIntegration) {
          toast.error(result.message, { duration: 5000 });
        } else {
          toast.success(result.message || `Test SMS sent to ${testPhone}`);
        }
      } catch (err) {
        console.error('Error sending test SMS:', err);
        const errorData = err.response?.data;

        if (errorData?.requiresIntegration) {
          toast.error(
            <div>
              {errorData.message}
              <Link to="/settings/integrations" className="block mt-1 text-primary underline">
                Configure Twilio →
              </Link>
            </div>,
            { duration: 6000 }
          );
        } else {
          toast.error(errorData?.message || 'Failed to send test SMS');
        }
      }
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500 dark:text-text-secondary">Loading notification settings...</span>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Failed to load notification settings: {error?.message || 'Unknown error'}</span>
        </div>
      </div>
    );
  }

  const channelOptions = [
    {
      key: 'emailEnabled',
      icon: Mail,
      label: 'Email Notifications',
      desc: 'Send updates via email',
      badge: null,
      disabled: false,
    },
    {
      key: 'smsEnabled',
      icon: MessageSquare,
      label: 'SMS Notifications',
      desc: 'Send text message updates',
      badge: { variant: 'warning', text: 'Premium Feature' },
      disabled: false,
    },
    {
      key: 'pushEnabled',
      icon: Smartphone,
      label: 'Push Notifications',
      desc: 'Mobile app notifications',
      badge: { variant: 'neutral', text: 'Coming Soon' },
      disabled: true,
    },
  ];

  const notificationOptions = [
    { key: 'bookingConfirmations', label: 'Booking Confirmations', desc: 'Send when a booking is confirmed' },
    { key: 'bookingReminders', label: 'Booking Reminders', desc: 'Send before upcoming appointments' },
    { key: 'checkinReminders', label: 'Check-In Reminders', desc: 'Remind customers to check in pets' },
    { key: 'vaccinationReminders', label: 'Vaccination Reminders', desc: 'Alert when vaccinations expiring' },
    { key: 'paymentReceipts', label: 'Payment Receipts', desc: 'Send receipts after payments' },
    { key: 'marketingEnabled', label: 'Marketing Communications', desc: 'Promotional emails and updates' },
  ];

  return (
    <div className="space-y-6">
      {/* Row 1: Communication Channels | Notification Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communication Channels */}
        <Card title="Communication Channels" description="Choose how to reach your customers">
          <div className="space-y-3">
            {channelOptions.map(({ key, icon: Icon, label, desc, badge, disabled }) => (
              <div key={key}>
                <div className="flex items-center justify-between p-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-500 dark:text-text-secondary flex-shrink-0" />
                    <div>
                      <span className="text-sm font-medium">{label}</span>
                      <p className="text-xs text-gray-500 dark:text-text-secondary">{desc}</p>
                      {badge && <Badge variant={badge.variant} size="sm" className="mt-1">{badge.text}</Badge>}
                    </div>
                  </div>
                  <Switch
                    checked={settings[key]}
                    onCheckedChange={(checked) => updateSetting(key, checked)}
                    disabled={disabled}
                  />
                </div>

                {/* SMS Warning when enabled */}
                {key === 'smsEnabled' && settings.smsEnabled && (
                  <div className="ml-10 mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="text-amber-700 dark:text-amber-300">
                          SMS requires Twilio integration to send messages.
                        </p>
                        <Link
                          to="/settings/sms"
                          className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 underline mt-1 hover:text-amber-800 dark:hover:text-amber-200"
                        >
                          Configure in SMS Settings
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Notification Types */}
        <Card title="Notification Types" description="Choose which events trigger notifications">
          <div className="space-y-2">
            {notificationOptions.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between p-2">
                <div>
                  <span className="text-sm font-medium">{label}</span>
                  <p className="text-xs text-gray-500 dark:text-text-secondary">{desc}</p>
                </div>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(checked) => updateSetting(key, checked)}
                />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
            <label className="block text-sm font-medium mb-1">Send reminders</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.reminderDaysBefore}
                onChange={(e) => updateSetting('reminderDaysBefore', parseInt(e.target.value) || 1)}
                min="1"
                max="7"
                className="w-16 px-2 py-1.5 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded text-gray-900 dark:text-text-primary text-sm"
              />
              <span className="text-sm text-gray-500 dark:text-text-secondary">days before appointment</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Quiet Hours | Test Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quiet Hours */}
        <Card title="Quiet Hours" description="Prevent notifications during certain hours">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                <Clock className="inline-block w-4 h-4 mr-1" />
                Quiet Hours Start
              </label>
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <Clock className="inline-block w-4 h-4 mr-1" />
                Quiet Hours End
              </label>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Non-urgent notifications (like marketing and reminders) will be queued during quiet hours
                and sent after they end. Urgent notifications (like booking confirmations) will still be sent immediately.
              </p>
            </div>
          </div>
        </Card>

        {/* Test Messages */}
        <Card title="Test Messages" description="Send test notifications to verify settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Test Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                />
                <Button
                  onClick={() => sendTestMessage('email')}
                  variant="outline"
                  disabled={sendTestMutation.isPending || !settings.emailEnabled}
                >
                  {sendTestMutation.isPending && sendTestMutation.variables?.type === 'email' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Send className="w-4 h-4 mr-2" />Send Test</>
                  )}
                </Button>
              </div>
              {!settings.emailEnabled && (
                <p className="text-xs text-gray-500 dark:text-text-secondary mt-1">Enable email notifications to send test emails</p>
              )}
            </div>

            {settings.smsEnabled && (
              <div>
                <label className="block text-sm font-medium mb-1">Test SMS</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+15551234567"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-surface-border bg-white dark:bg-surface-primary rounded-md text-gray-900 dark:text-text-primary"
                  />
                  <Button
                    onClick={() => sendTestMessage('sms')}
                    variant="outline"
                    disabled={sendTestMutation.isPending}
                  >
                    {sendTestMutation.isPending && sendTestMutation.variables?.type === 'sms' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Send Test</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Save Button Row */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" disabled>
          <Globe className="w-4 h-4 mr-2" />
          Preview Templates
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending || !hasChanges}>
          {updateMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
          ) : (
            <><Settings className="w-4 h-4 mr-2" />Save Settings</>
          )}
        </Button>
      </div>

      {hasChanges && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-right">
          You have unsaved changes
        </p>
      )}
    </div>
  );
};

export default CommunicationNotifications;
