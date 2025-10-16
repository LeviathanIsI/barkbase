import { Monitor, Smartphone, MapPin, Clock, LogOut, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const ActiveSessions = () => {
  // Mock session data
  const sessions = [
    {
      id: 1,
      device: 'Chrome on Windows',
      browser: 'Chrome',
      os: 'Windows',
      location: 'San Francisco, CA',
      ip: '192.168.1.1',
      lastActive: 'Just now',
      signedIn: 'Jan 15, 2025 at 9:00 AM',
      current: true,
      icon: Monitor
    },
    {
      id: 2,
      device: 'Safari on iPhone 14 Pro',
      browser: 'Safari',
      os: 'iOS',
      location: 'Oakland, CA',
      ip: '10.0.0.45',
      lastActive: '2 hours ago',
      signedIn: 'Jan 14, 2025 at 3:30 PM',
      current: false,
      icon: Smartphone
    },
    {
      id: 3,
      device: 'Edge on MacBook',
      browser: 'Edge',
      os: 'macOS',
      location: 'Berkeley, CA',
      ip: '172.16.0.8',
      lastActive: 'Yesterday',
      signedIn: 'Jan 13, 2025 at 8:00 AM',
      current: false,
      icon: Monitor
    }
  ];

  const handleSignOut = (sessionId) => {
    console.log('Sign out session:', sessionId);
    // TODO: Implement sign out functionality
  };

  const handleSignOutAll = () => {
    console.log('Sign out all other sessions');
    // TODO: Implement sign out all functionality
  };

  return (
    <Card title="Active Sessions" icon={Monitor}>
      <div className="space-y-4">
        <p className="text-gray-600">
          Manage all devices where you're currently logged in.
        </p>

        <div className="space-y-3">
          {sessions.map((session) => {
            const Icon = session.icon;
            return (
              <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Icon className="w-6 h-6 text-gray-600" />
                      {session.current && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {session.device}
                        </h4>
                        {session.current && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            Current Session
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{session.location} • IP: {session.ip}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Last active: {session.lastActive}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Signed in: {session.signedIn}
                        </div>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSignOut(session.id)}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <LogOut className="w-3 h-3" />
                      Sign Out
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Session Settings */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900">Session Timeout</h4>
              <p className="text-sm text-gray-600">Automatically sign out after period of inactivity</p>
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
              <option value="480">8 hours</option>
            </select>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-gray-700">Require password after timeout</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Sign Out All Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900 mb-1">
                Don't recognize a device?
              </h4>
              <p className="text-sm text-yellow-800 mb-3">
                Sign out all other sessions to secure your account.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOutAll}
                className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
              >
                Sign out all other sessions
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ActiveSessions;
