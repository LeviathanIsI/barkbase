import { useState } from 'react';
import { Monitor, Smartphone, MapPin, Clock, LogOut, AlertTriangle } from 'lucide-react';
import { useTimezoneUtils } from '@/lib/timezone';
import toast from 'react-hot-toast';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAuthSessionsQuery,
  useRevokeSessionMutation,
  useRevokeAllOtherSessionsMutation,
} from '@/features/auth/api';

// Helper function to parse user agent string into readable device name
const parseUserAgent = (ua) => {
  if (!ua) return { device: 'Unknown Device', icon: Monitor };
  
  // Detect browser
  let browser = 'Unknown Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  
  // Detect OS
  let os = '';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  // Determine icon
  const isMobile = ua.includes('Android') || ua.includes('iPhone') || ua.includes('iPad');
  
  return {
    device: os ? `${browser} on ${os}` : browser,
    icon: isMobile ? Smartphone : Monitor,
  };
};

// Helper function to format last active timestamp (takes timezone formatter)
const formatLastActive = (timestamp, formatShortDate) => {
  if (!timestamp) return 'Unknown';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return formatShortDate(date);
};

const ActiveSessions = () => {
  const tz = useTimezoneUtils();
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const { data: sessions = [], isLoading } = useAuthSessionsQuery();
  const revokeSession = useRevokeSessionMutation();
  const revokeAllOtherSessions = useRevokeAllOtherSessionsMutation();

  const handleSignOut = async (sessionId) => {
    if (revokeSession.isPending) return;
    
    try {
      await revokeSession.mutateAsync(sessionId);
      toast.success('Session signed out successfully');
    } catch (error) {
      console.error('Session sign out error:', error);
      toast.error(error.message || 'Failed to sign out session');
    }
  };

  const handleSignOutAll = async () => {
    if (revokeAllOtherSessions.isPending) return;
    
    try {
      await revokeAllOtherSessions.mutateAsync();
      toast.success('Signed out of all other sessions');
    } catch (error) {
      console.error('Sign out all sessions error:', error);
      toast.error(error.message || 'Failed to sign out all sessions');
    }
  };

  if (isLoading) {
    return (
      <Card title="Active Sessions" icon={Monitor}>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card title="Active Sessions" icon={Monitor}>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-text-secondary">
          Manage all devices where you're currently logged in.
        </p>

        {sessions.length === 0 ? (
          <p className="text-gray-500 dark:text-text-secondary text-center py-4">
            No active sessions found.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const { device, icon: Icon } = parseUserAgent(session.userAgent);
              return (
                <div key={session.sessionId} className="border border-gray-200 dark:border-surface-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Icon className="w-6 h-6 text-gray-600 dark:text-text-secondary" />
                        {session.isCurrentSession && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-surface-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-text-primary">
                            {device}
                          </h4>
                          {session.isCurrentSession && (
                            <span className="text-xs bg-blue-100 dark:bg-surface-secondary text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                              Current Session
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-text-secondary">
                          {session.ipAddress && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>IP: {session.ipAddress}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Last active: {formatLastActive(session.lastActive, tz.formatShortDate)}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-text-secondary">
                            Signed in: {tz.formatDate(session.createdAt, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                    {!session.isCurrentSession && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSignOut(session.sessionId)}
                        disabled={revokeSession.isPending && revokeSession.variables === session.sessionId}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <LogOut className="w-3 h-3" />
                        {revokeSession.isPending && revokeSession.variables === session.sessionId ? 'Signing out...' : 'Sign Out'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Session Settings */}
        <div className="border-t border-gray-200 dark:border-surface-border pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-text-primary">Session Timeout</h4>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Automatically sign out after period of inactivity</p>
            </div>
            <div className="min-w-[140px]">
              <StyledSelect
                options={[
                  { value: '30', label: '30 minutes' },
                  { value: '60', label: '1 hour' },
                  { value: '120', label: '2 hours' },
                  { value: '480', label: '8 hours' },
                ]}
                value={sessionTimeout}
                onChange={(opt) => setSessionTimeout(opt?.value || '60')}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-gray-700 dark:text-text-primary">Require password after timeout</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 dark:bg-surface-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-surface-primary after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Sign Out All Warning */}
        {sessions.filter(s => !s.isCurrentSession).length > 0 && (
          <div className="bg-yellow-50 dark:bg-surface-primary border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-1">
                  Don't recognize a device?
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-3">
                  Sign out all other sessions to secure your account.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOutAll}
                  disabled={revokeAllOtherSessions.isPending}
                  className="text-yellow-800 border-yellow-300 hover:bg-yellow-100 dark:bg-surface-secondary"
                >
                  {revokeAllOtherSessions.isPending ? 'Signing out...' : 'Sign out all other sessions'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ActiveSessions;
