import { useState } from 'react';
import { FileText, Download, Filter, Shield, Key, User, Lock, AlertTriangle, MapPin } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';

const SecurityAudit = () => {
  const [eventFilter, setEventFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('90');

  // Mock audit log data
  const auditEvents = [
    {
      id: 1,
      date: 'Today',
      time: '9:05 AM',
      event: 'Security settings viewed',
      actor: 'Joshua Bradford (You)',
      ip: '192.168.1.1',
      icon: Shield
    },
    {
      id: 2,
      date: 'Jan 10, 2025',
      time: '2:30 PM',
      event: 'Password changed',
      actor: 'Joshua Bradford (You)',
      ip: '192.168.1.1',
      icon: Key
    },
    {
      id: 3,
      date: 'Jan 5, 2025',
      time: '11:00 AM',
      event: 'Team member added',
      details: 'Sarah Johnson invited as Manager',
      actor: 'Joshua Bradford (You)',
      ip: '192.168.1.1',
      icon: User
    },
    {
      id: 4,
      date: 'Dec 28, 2024',
      time: '3:45 PM',
      event: '2FA enabled',
      details: 'Method: Authenticator App',
      actor: 'Joshua Bradford (You)',
      ip: '192.168.1.1',
      icon: Lock
    }
  ];

  const getEventIcon = (event) => {
    switch (event.toLowerCase()) {
      case 'security settings viewed':
        return Shield;
      case 'password changed':
        return Key;
      case 'team member added':
        return User;
      case '2fa enabled':
        return Lock;
      default:
        return FileText;
    }
  };

  return (
    <Card title="Security Audit Log" icon={FileText}>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-text-secondary">
          Track all security-related changes to your account.
        </p>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[160px]">
            <StyledSelect
              options={[
                { value: 'all', label: 'All Events' },
                { value: 'auth', label: 'Authentication' },
                { value: 'access', label: 'Access Control' },
                { value: 'settings', label: 'Settings Changes' },
              ]}
              value={eventFilter}
              onChange={(opt) => setEventFilter(opt?.value || 'all')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <div className="min-w-[140px]">
            <StyledSelect
              options={[
                { value: '90', label: 'Last 90 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '7', label: 'Last 7 days' },
              ]}
              value={dateFilter}
              onChange={(opt) => setDateFilter(opt?.value || '90')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Audit Events */}
        <div className="space-y-4">
          {['Today', 'Jan 10, 2025', 'Jan 5, 2025', 'Dec 28, 2024'].map((dateGroup) => (
            <div key={dateGroup}>
              <h3 className="font-medium text-gray-900 dark:text-text-primary mb-3">{dateGroup}</h3>
              <div className="space-y-3">
                {auditEvents
                  .filter(event => event.date === dateGroup)
                  .map((event) => {
                    const Icon = event.icon;
                    return (
                      <div key={event.id} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-surface-border rounded-lg">
                        <div className="p-2 bg-blue-100 dark:bg-surface-secondary rounded-full">
                          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 dark:text-text-primary">{event.event}</span>
                            <span className="text-sm text-gray-500 dark:text-text-secondary">{event.time}</span>
                          </div>

                          {event.details && (
                            <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">{event.details}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-text-secondary">
                            <span>By: {event.actor}</span>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>IP: {event.ip}</span>
                            </div>
                          </div>
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
            Show More (15 more events)
          </Button>
        </div>

        {/* Retention Notice */}
        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Audit logs retained for 90 days
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Upgrade to Pro for 1-year retention, Enterprise for 365 days
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SecurityAudit;
