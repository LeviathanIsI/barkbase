import { useState } from 'react';
import { CheckCircle, X, AlertTriangle, MapPin, Monitor, Smartphone, Calendar, Download } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';

const LoginHistory = () => {
  const [activityFilter, setActivityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30');

  // Mock login history data
  const loginHistory = [
    {
      date: 'Today',
      events: [
        {
          id: 1,
          type: 'success',
          time: '9:00 AM',
          device: 'Chrome on Windows',
          location: 'San Francisco, CA',
          ip: '192.168.1.1',
          icon: Monitor
        }
      ]
    },
    {
      date: 'Yesterday',
      events: [
        {
          id: 2,
          type: 'success',
          time: '3:30 PM',
          device: 'Safari on iPhone',
          location: 'Oakland, CA',
          ip: '10.0.0.45',
          icon: Smartphone
        }
      ]
    },
    {
      date: 'Jan 13, 2025',
      events: [
        {
          id: 3,
          type: 'success',
          time: '8:00 AM',
          device: 'Edge on MacBook',
          location: 'Berkeley, CA',
          ip: '172.16.0.8',
          icon: Monitor
        }
      ]
    },
    {
      date: 'Jan 10, 2025',
      events: [
        {
          id: 4,
          type: 'failed',
          time: '2:15 AM',
          device: 'Unknown Browser',
          location: 'Moscow, Russia',
          ip: '95.123.45.67',
          suspicious: true,
          icon: AlertTriangle
        }
      ]
    }
  ];

  const getEventIcon = (type, suspicious) => {
    if (suspicious) return AlertTriangle;
    return type === 'success' ? CheckCircle : X;
  };

  const getEventColor = (type, suspicious) => {
    if (suspicious) return 'text-red-600';
    return type === 'success' ? 'text-green-600' : 'text-red-600';
  };

  const getEventText = (type, suspicious) => {
    if (suspicious) return 'Failed login attempt';
    return type === 'success' ? 'Successful login' : 'Failed login attempt';
  };

  return (
    <Card title="Login History" icon={Calendar}>
      <div className="space-y-6">
        <p className="text-gray-600 dark:text-text-secondary">
          Track all login attempts to your account.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[180px]">
            <StyledSelect
              options={[
                { value: 'all', label: 'All Activity' },
                { value: 'success', label: 'Successful Logins' },
                { value: 'failed', label: 'Failed Attempts' },
                { value: 'suspicious', label: 'Suspicious Activity' },
              ]}
              value={activityFilter}
              onChange={(opt) => setActivityFilter(opt?.value || 'all')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <div className="min-w-[140px]">
            <StyledSelect
              options={[
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
                { value: '365', label: 'Last year' },
              ]}
              value={dateFilter}
              onChange={(opt) => setDateFilter(opt?.value || '30')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Login Events */}
        <div className="space-y-6">
          {loginHistory.map((day) => (
            <div key={day.date}>
              <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">{day.date}</h3>
              <div className="space-y-3">
                {day.events.map((event) => {
                  const Icon = event.icon || getEventIcon(event.type, event.suspicious);
                  const iconColor = getEventColor(event.type, event.suspicious);

                  return (
                    <div key={event.id} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-surface-border rounded-lg">
                      <div className={`p-2 rounded-full ${event.suspicious ? 'bg-red-100 dark:bg-surface-secondary' : event.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-text-primary">
                            {getEventText(event.type, event.suspicious)}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-text-secondary">{event.time}</span>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-text-secondary mb-2">
                          <div className="flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            <span>{event.device}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{event.location} • IP: {event.ip}</span>
                          </div>
                        </div>

                        {event.suspicious && (
                          <div className="flex items-center gap-2 mt-2">
                            <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50 dark:bg-surface-primary">
                              Report Suspicious Activity
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline">
            Show More (27 more events)
          </Button>
        </div>

        {/* Email Notifications */}
        <div className="border-t border-gray-200 dark:border-surface-border pt-6">
          <h4 className="font-medium text-gray-900 dark:text-text-primary mb-3">Email me when:</h4>
          <div className="space-y-2">
            {[
              'Login from new device',
              'Login from unusual location',
              'Multiple failed login attempts (3+ in 10 minutes)',
              'Password changed'
            ].map((notification, index) => (
              <label key={index} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 dark:border-surface-border"
                />
                <span className="text-sm">{notification}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LoginHistory;
