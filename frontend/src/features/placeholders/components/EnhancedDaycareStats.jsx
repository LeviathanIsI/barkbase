import { Calendar, Users, Clock, Home, AlertTriangle, Phone, CheckCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const EnhancedDaycareStats = ({ pets, currentDate }) => {
  // Calculate stats
  const stats = {
    total: pets.length,
    checkedIn: pets.filter(p => p.status === 'checked_in').length,
    scheduled: pets.filter(p => p.status === 'scheduled').length,
    checkedOut: pets.filter(p => p.status === 'checked_out').length
  };

  const alerts = [
    {
      id: 1,
      type: 'late',
      message: 'Bella checked out (needs extra attention flag) - Follow up',
      pet: 'Bella',
      action: 'Call Owner',
      severity: 'warning'
    },
    {
      id: 2,
      type: 'late',
      message: 'Bella late (should have arrived 30 mins ago) - Call owner',
      pet: 'Bella',
      action: 'Call Owner',
      severity: 'warning'
    },
    {
      id: 3,
      type: 'info',
      message: 'Lucy arriving in 30 mins - Prepare check-in station',
      pet: 'Lucy',
      action: 'Prepare Station',
      severity: 'info'
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'warning': return 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-surface-primary';
      case 'error': return 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-surface-primary';
      default: return 'border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-surface-primary';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Today's Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-surface-primary dark:to-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">📊 DAYCARE DASHBOARD</h2>
            <p className="text-sm text-blue-700 dark:text-blue-300">{format(currentDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{alerts.length}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Active Alerts</div>
          </div>
        </div>
      </div>

      {/* Stats Cards with Action Buttons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Total Pets</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.total}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +2 from yesterday
                </p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            View All
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Checked In</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.checkedIn}</p>
                <p className="text-xs text-gray-600 dark:text-text-secondary">On time</p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            Details
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.scheduled}</p>
                <p className="text-xs text-gray-600 dark:text-text-secondary">Arriving soon</p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            Arriving
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Checked Out</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.checkedOut}</p>
                <p className="text-xs text-gray-600 dark:text-text-secondary">Early pickup</p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            Complete
          </Button>
        </Card>
      </div>

      {/* Capacity Alerts */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">⚠️ ALERTS & ATTENTION NEEDED</h3>
        </div>

        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className={`border-l-4 rounded-r-lg p-4 ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getSeverityIcon(alert.severity)}
                    <span className="font-medium text-gray-900 dark:text-text-primary">{alert.message}</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-text-secondary">
                    Pet: {alert.pet}
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  {alert.action}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600 dark:text-text-secondary">
              <span>Last updated: 2 minutes ago</span>
            </div>
            <Button variant="outline" size="sm">
              Resolve Alerts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDaycareStats;
