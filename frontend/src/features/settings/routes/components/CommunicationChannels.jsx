import { Mail, Smartphone, Monitor, Smartphone as PhoneIcon, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const CommunicationChannels = ({ preferences, onUpdate }) => {
  const Toggle = ({ enabled, onChange }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  const handleEmailToggle = () => {
    onUpdate({
      email: { ...preferences.email, enabled: !preferences.email.enabled }
    });
  };

  const handleSmsToggle = () => {
    onUpdate({
      sms: { ...preferences.sms, enabled: !preferences.sms.enabled }
    });
  };

  const handleInAppToggle = () => {
    onUpdate({
      inApp: { ...preferences.inApp, enabled: !preferences.inApp.enabled }
    });
  };

  const handlePushToggle = () => {
    onUpdate({
      push: { ...preferences.push, enabled: !preferences.push.enabled }
    });
  };

  const handleAddPhoneNumber = () => {
    // TODO: Implement phone number addition
  };

  const handleDownloadApp = (platform) => {
    // TODO: Implement app download
  };

  return (
    <Card title="Communication Channels" description="Choose how you want to be notified">
      <div className="space-y-4">
        {/* Email Notifications */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${preferences.email.enabled ? 'bg-blue-100' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
              <Mail className={`w-5 h-5 ${preferences.email.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-text-tertiary'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-text-primary">Email Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-text-secondary">{preferences.email.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${preferences.email.enabled ? 'text-green-600' : 'text-gray-500 dark:text-text-secondary'}`}>
              {preferences.email.enabled ? 'ON' : 'OFF'}
            </span>
            <Toggle enabled={preferences.email.enabled} onChange={handleEmailToggle} />
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${preferences.sms.enabled ? 'bg-green-100' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
              <PhoneIcon className={`w-5 h-5 ${preferences.sms.enabled ? 'text-green-600' : 'text-gray-400 dark:text-text-tertiary'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-text-primary">SMS Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-text-secondary">
                {preferences.sms.number ? preferences.sms.number : 'Add phone number to enable'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {preferences.sms.number ? (
              <>
                <span className={`text-sm font-medium ${preferences.sms.enabled ? 'text-green-600' : 'text-gray-500 dark:text-text-secondary'}`}>
                  {preferences.sms.enabled ? 'ON' : 'OFF'}
                </span>
                <Toggle enabled={preferences.sms.enabled} onChange={handleSmsToggle} />
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={handleAddPhoneNumber}>
                <Plus className="w-4 h-4 mr-1" />
                Add Phone Number
              </Button>
            )}
          </div>
        </div>

        {/* In-App Notifications */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${preferences.inApp.enabled ? 'bg-purple-100' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
              <Monitor className={`w-5 h-5 ${preferences.inApp.enabled ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-text-tertiary'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-text-primary">In-App Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Show notifications in the app</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${preferences.inApp.enabled ? 'text-green-600' : 'text-gray-500 dark:text-text-secondary'}`}>
              {preferences.inApp.enabled ? 'ON' : 'OFF'}
            </span>
            <Toggle enabled={preferences.inApp.enabled} onChange={handleInAppToggle} />
          </div>
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-surface-border rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${preferences.push.enabled ? 'bg-orange-100' : 'bg-gray-100 dark:bg-surface-secondary'}`}>
              <Smartphone className={`w-5 h-5 ${preferences.push.enabled ? 'text-orange-600' : 'text-gray-400 dark:text-text-tertiary'}`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-text-primary">Push Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Receive alerts on your mobile device</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${preferences.push.enabled ? 'text-green-600' : 'text-gray-500 dark:text-text-secondary'}`}>
              {preferences.push.enabled ? 'ON' : 'OFF'}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadApp('iOS')}
                disabled={!preferences.push.enabled}
              >
                Download iOS App
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDownloadApp('Android')}
                disabled={!preferences.push.enabled}
              >
                Download Android App
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CommunicationChannels;
