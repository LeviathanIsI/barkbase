import { Bell, Mail, Smartphone, Monitor } from 'lucide-react';
import Card from '@/components/ui/Card';

const SecurityNotifications = () => {
  return (
    <Card title="Security Notifications" icon={Bell}>
      <div className="space-y-6">
        <p className="text-gray-600">
          Choose what security events trigger alerts.
        </p>

        {/* Email Notifications */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Notifications (joshua.r.bradford1@gmail.com)
          </h3>
          <div className="space-y-2">
            {[
              'New device login',
              'Login from unusual location',
              'Password changed',
              '2FA disabled or changed',
              'New team member added',
              'Permission changes',
              'API key created or regenerated',
              'Failed login attempts (3+ in 10 minutes)'
            ].map((notification, index) => (
              <label key={index} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked={index < 7} // First 7 are checked by default
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{notification}</span>
              </label>
            ))}
          </div>
        </div>

        {/* SMS Notifications */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            SMS Notifications ((555) 123-4567)
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300"
              />
              <span className="text-sm">Critical alerts only (suspicious activity)</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="rounded border-gray-300"
              />
              <span className="text-sm">All security notifications</span>
            </label>
          </div>
        </div>

        {/* Push Notifications */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Push Notifications (Browser)
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="rounded border-gray-300"
              />
              <span className="text-sm">Enabled for critical alerts</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="rounded border-gray-300"
              />
              <span className="text-sm">All notifications</span>
            </label>
          </div>
        </div>

        {/* Notification Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Notification Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• Email: 7 of 8 events enabled</p>
            <p>• SMS: Critical alerts only</p>
            <p>• Push: Critical alerts enabled</p>
            <p>• Last notification: Today at 9:00 AM</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SecurityNotifications;
