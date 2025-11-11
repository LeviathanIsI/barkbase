import { Calendar, TrendingUp, Users, Home, AlertTriangle, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { useCapacity } from '@/features/schedule/api/api';

const EnhancedStatsDashboard = ({ currentDate, stats: todayStats = {} }) => {
  // Real capacity data from API
  const dateStr = currentDate.toISOString().split('T')[0];
  const { data: capacityData, isLoading: capacityLoading } = useCapacity(dateStr, dateStr);

  // Use real stats passed from parent or defaults
  const stats = {
    bookings: {
      today: todayStats.totalBookings || 0,
      change: 3, // Would need historical data
      trend: 'up'
    },
    capacity: {
      percentage: todayStats.occupancyPct || 0,
      status: (todayStats.occupancyPct || 0) >= 90 ? 'high-demand' :
              (todayStats.occupancyPct || 0) >= 80 ? 'moderate' : 'normal',
      change: 8 // Would need historical data
    },
    checkins: {
      completed: todayStats.checkInsCompleted || 0,
      pending: todayStats.checkInsPending || 0
    },
    available: {
      spots: todayStats.availableSpots || 0,
      total: todayStats.totalCapacity || 0
    }
  };

  // TODO: Replace with real alerts from alerts API
  const alerts = []; // Will be populated from alerts/conflicts API

  const getCapacityColor = (percentage) => {
    if (percentage >= 95) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-surface-secondary';
    if (percentage >= 90) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-surface-secondary';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-surface-secondary';
    return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-surface-secondary';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'warning': return 'border-yellow-200 dark:border-yellow-900/30 bg-yellow-50 dark:bg-surface-primary';
      case 'error': return 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-surface-primary';
      default: return 'border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-surface-primary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Today's Dashboard Header */}
      <div className="bg-primary-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">📊 TODAY'S DASHBOARD</h2>
            <p className="text-sm text-blue-700 dark:text-blue-300">{format(currentDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">4</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Active Alerts</div>
          </div>
        </div>
      </div>

      {/* Stats Cards with Action Buttons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Today's Bookings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.bookings.today}</p>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +{stats.bookings.change} from yesterday
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCapacityColor(stats.capacity.percentage)}`}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Capacity</p>
              <p className={`text-2xl font-bold ${stats.capacity.percentage >= 90 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-text-primary'}`}>
                {stats.capacity.percentage}%
              </p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">
                {stats.capacity.status === 'high-demand' ? '⚠️ High demand' : 'Week-over-week'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Check-ins Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.checkins.completed}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {stats.checkins.pending} pending
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-text-secondary">Available Spots</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{stats.available.spots}</p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">
                Across all kennels
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Capacity Alerts */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">⚠️ CAPACITY ALERTS</h3>
        </div>

        <div className="space-y-4">
          {alerts.length > 0 ? alerts.map((alert, index) => (
            <div key={index} className={`border-l-4 rounded-r-lg p-4 ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-text-primary mb-2">{alert.title}</h4>
                  <div className="flex flex-wrap gap-2">
                    {alert.actions.map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  alert.impact === 'High' ? 'bg-red-100 dark:bg-surface-secondary text-red-800 dark:text-red-200' :
                  alert.impact === 'Medium' ? 'bg-yellow-100 dark:bg-surface-secondary text-yellow-800 dark:text-yellow-200' :
                  'bg-green-100 dark:bg-surface-secondary text-green-800 dark:text-green-200'
                }`}>
                  {alert.impact}
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-text-secondary">No capacity alerts at this time</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-surface-border">
          <div className="text-sm text-gray-600 dark:text-text-secondary">
            <span>Last updated: 2 minutes ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedStatsDashboard;
