import { AlertTriangle, Mail, Smartphone, Monitor } from 'lucide-react';
import Card from '@/components/ui/Card';

const CriticalAlerts = ({ alerts, onUpdate }) => {
  const criticalAlertTypes = [
    { key: 'paymentFailures', label: 'Payment failures', description: 'When payments fail or are declined' },
    { key: 'systemDowntime', label: 'System downtime', description: 'When the system goes offline' },
    { key: 'securityAlerts', label: 'Security alerts', description: 'Security-related events and breaches' },
    { key: 'emergencyIncidents', label: 'Emergency incidents', description: 'Medical emergencies or accidents' },
    { key: 'sameDayCancellations', label: 'Appointment cancellations (within 24 hours)', description: 'Last-minute cancellations' }
  ];

  const channels = [
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'sms', label: 'SMS', icon: Smartphone },
    { key: 'inApp', label: 'In-App', icon: Monitor }
  ];

  const handleAlertToggle = (alertKey, enabled) => {
    onUpdate({
      ...alerts,
      [alertKey]: enabled
    });
  };

  const handleChannelToggle = (channelKey, enabled) => {
    const newChannels = enabled
      ? [...alerts.channels, channelKey]
      : alerts.channels.filter(c => c !== channelKey);

    onUpdate({
      ...alerts,
      channels: newChannels
    });
  };

  return (
    <Card title="Critical Alerts" icon={AlertTriangle}>
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900 mb-1">Always receive these notifications</h4>
              <p className="text-sm text-red-800">
                These critical alerts will be sent even if other notification channels are disabled or during quiet hours.
              </p>
            </div>
          </div>
        </div>

        {/* Critical Alert Types */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Critical Alert Types</h3>
          <div className="space-y-3">
            {criticalAlertTypes.map((alertType) => (
              <label key={alertType.key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={alerts[alertType.key]}
                  onChange={(e) => handleAlertToggle(alertType.key, e.target.checked)}
                  className="mt-1 rounded border-gray-300"
                />
                <div>
                  <span className="font-medium text-gray-900">{alertType.label}</span>
                  <p className="text-sm text-gray-600">{alertType.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Delivery Channels */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">These will be sent via:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const Icon = channel.icon;
              const isEnabled = alerts.channels.includes(channel.key);

              return (
                <label
                  key={channel.key}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isEnabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => handleChannelToggle(channel.key, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <div className={`p-2 rounded-full ${isEnabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-4 h-4 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <span className={`font-medium ${isEnabled ? 'text-blue-900' : 'text-gray-700'}`}>
                      {channel.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Additional Settings */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Additional Settings</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Critical alerts bypass quiet hours restrictions</p>
            <p>• SMS alerts will be sent even if SMS is disabled for other notifications</p>
            <p>• Critical alerts are logged and cannot be disabled</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CriticalAlerts;
