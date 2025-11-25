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
        <div className="bg-[var(--bb-color-alert-danger-bg)] border border-[var(--bb-color-alert-danger-border)] rounded-lg p-[var(--bb-space-4)]">
          <div className="flex items-start gap-[var(--bb-space-3)]">
            <AlertTriangle className="w-5 h-5 text-[var(--bb-color-status-negative)] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-alert-danger-text)] mb-[var(--bb-space-1)]">Always receive these notifications</h4>
              <p className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
                These critical alerts will be sent even if other notification channels are disabled or during quiet hours.
              </p>
            </div>
          </div>
        </div>

        {/* Critical Alert Types */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">Critical Alert Types</h3>
          <div className="space-y-3">
            {criticalAlertTypes.map((alertType) => (
              <label key={alertType.key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={alerts[alertType.key]}
                  onChange={(e) => handleAlertToggle(alertType.key, e.target.checked)}
                  className="mt-1 rounded border-gray-300 dark:border-surface-border"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-text-primary">{alertType.label}</span>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">{alertType.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Delivery Channels */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">These will be sent via:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {channels.map((channel) => {
              const Icon = channel.icon;
              const isEnabled = alerts.channels.includes(channel.key);

              return (
                <label
                  key={channel.key}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isEnabled ? 'border-blue-500 bg-blue-50 dark:bg-surface-primary' : 'border-gray-200 dark:border-surface-border hover:bg-gray-50 dark:hover:bg-surface-secondary dark:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => handleChannelToggle(channel.key, e.target.checked)}
                      className="rounded border-gray-300 dark:border-surface-border"
                    />
                    <div className={`p-2 rounded-full ${isEnabled ? 'bg-blue-100' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
                      <Icon className={`w-4 h-4 ${isEnabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-text-tertiary'}`} />
                    </div>
                    <span className={`font-medium ${isEnabled ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-text-primary'}`}>
                      {channel.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Additional Settings */}
        <div className="bg-[var(--bb-color-alert-neutral-bg)] border border-[var(--bb-color-alert-neutral-border)] rounded-lg p-[var(--bb-space-4)]">
          <h4 className="font-[var(--bb-font-weight-medium)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">Additional Settings</h4>
          <div className="space-y-[var(--bb-space-2)] text-[var(--bb-font-size-sm)] text-[var(--bb-color-text-muted)]">
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
