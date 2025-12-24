import { Smartphone, Download, Bell, Volume2, Smartphone as PhoneIcon } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const MobilePush = () => {
  const handleDownloadApp = (platform) => {
    // TODO: Implement app download
  };

  return (
    <Card title="Push Notifications" icon={Smartphone}>
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-text-secondary">
          Receive alerts on your mobile device
        </p>

        {/* App Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-surface-primary rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 dark:bg-surface-secondary rounded-full">
                <PhoneIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100">iOS App</h4>
                <p className="text-sm text-red-800 dark:text-red-200">Not installed</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:bg-surface-primary"
              onClick={() => handleDownloadApp('iOS')}
            >
              <Download className="w-4 h-4 mr-2" />
              Download iOS App
            </Button>
          </div>

          <div className="border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-surface-primary rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 dark:bg-surface-secondary rounded-full">
                <Smartphone className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100">Android App</h4>
                <p className="text-sm text-red-800 dark:text-red-200">Not installed</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:bg-surface-primary"
              onClick={() => handleDownloadApp('Android')}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Android App
            </Button>
          </div>
        </div>

        {/* Push Settings (Disabled when no app installed) */}
        <div className="opacity-50">
          <h3 className="font-medium text-gray-900 dark:text-text-primary mb-4">Push notification settings</h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span className="text-sm">Show notification badges</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                disabled
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span className="text-sm">Play sound for critical alerts</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                disabled
                className="rounded border-gray-300 dark:border-surface-border"
              />
              <span className="text-sm">Vibrate on notifications</span>
            </label>
          </div>
        </div>

        {/* Download Prompt */}
        <div className="bg-primary-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-6">
          <div className="text-center">
            <Smartphone className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Get Real-Time Alerts on Mobile
            </h4>
            <p className="text-blue-700 dark:text-blue-300 mb-4">
              Download our mobile app to receive push notifications wherever you are.
              Never miss critical alerts, booking confirmations, or payment notifications.
            </p>
            <div className="flex gap-3 justify-center">
              <Button className="bg-black hover:bg-gray-800" onClick={() => handleDownloadApp('iOS')}>
                <Download className="w-4 h-4 mr-2" />
                Download iOS App
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleDownloadApp('Android')}>
                <Download className="w-4 h-4 mr-2" />
                Download Android App
              </Button>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-gray-50 dark:bg-surface-secondary border border-gray-200 dark:border-surface-border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">Mobile App Benefits</h4>
          <ul className="text-sm text-gray-600 dark:text-text-secondary space-y-1">
            <li>• Real-time push notifications for all critical alerts</li>
            <li>• Access to facility dashboard on-the-go</li>
            <li>• Emergency contact information always available</li>
            <li>• Photo uploads and report card access</li>
            <li>• Team communication and shift management</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default MobilePush;
