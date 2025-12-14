import { useState } from 'react';
import { TestTube, Mail, Smartphone, Monitor, Send } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';

const NotificationTesting = () => {
  const [testChannel, setTestChannel] = useState('email');
  const [testType, setTestType] = useState('booking');

  const channels = [
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'sms', label: 'SMS', icon: Smartphone },
    { key: 'inApp', label: 'In-App', icon: Monitor }
  ];

  const notificationTypes = [
    { key: 'booking', label: 'Booking Reminder', description: 'Test booking confirmation notifications' },
    { key: 'payment', label: 'Payment Notification', description: 'Test payment-related alerts' },
    { key: 'health', label: 'Health Alert', description: 'Test vaccination and health reminders' },
    { key: 'inquiry', label: 'Customer Inquiry', description: 'Test new customer inquiry alerts' },
    { key: 'critical', label: 'Critical Alert', description: 'Test emergency notification delivery' }
  ];

  const handleSendTest = () => {
    // TODO: Send test notification
  };

  return (
    <Card title="Test Your Notifications" icon={TestTube}>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-text-secondary">
          Send a test notification to verify your settings
        </p>

        {/* Channel Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
            Channel to test
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <label
                  key={channel.key}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    testChannel === channel.key ? 'border-blue-500 bg-blue-50 dark:bg-surface-primary' : 'border-gray-200 dark:border-surface-border hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="testChannel"
                      value={channel.key}
                      checked={testChannel === channel.key}
                      onChange={(e) => setTestChannel(e.target.value)}
                      className="text-blue-600 dark:text-blue-400"
                    />
                    <div className={`p-2 rounded-full ${testChannel === channel.key ? 'bg-blue-100' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
                      <Icon className={`w-4 h-4 ${testChannel === channel.key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-text-tertiary'}`} />
                    </div>
                    <span className={`font-medium ${testChannel === channel.key ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-text-primary'}`}>
                      {channel.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Notification Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-primary mb-2">
            Notification type
          </label>
          <StyledSelect
            options={notificationTypes.map((type) => ({
              value: type.key,
              label: type.label,
            }))}
            value={testType}
            onChange={(opt) => setTestType(opt?.value || 'booking')}
            isClearable={false}
            isSearchable={false}
          />
          <p className="text-sm text-gray-600 dark:text-text-secondary mt-1">
            {notificationTypes.find(t => t.key === testType)?.description}
          </p>
        </div>

        {/* Send Test Button */}
        <Button onClick={handleSendTest}>
          <Send className="w-4 h-4 mr-2" />
          Send Test Notification
        </Button>

        {/* Test History */}
        <div className="border-t border-gray-200 dark:border-surface-border pt-4">
          <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">Test History</h4>
          <div className="text-sm text-gray-600 dark:text-text-secondary">
            <p>Last test sent: Never</p>
            <p>No test notifications have been sent yet</p>
          </div>
        </div>

        {/* Testing Tips */}
        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Testing Tips</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Test notifications during business hours to avoid quiet hour restrictions</li>
            <li>• Critical alerts will always be sent, even if channels are disabled</li>
            <li>• SMS tests may incur carrier charges</li>
            <li>• Test results appear in your notification history</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default NotificationTesting;
