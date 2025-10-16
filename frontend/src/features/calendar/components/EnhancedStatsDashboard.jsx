import { Calendar, TrendingUp, Users, Home, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const EnhancedStatsDashboard = ({ currentDate }) => {
  // Mock data - in real app this would come from API
  const stats = {
    bookings: {
      today: 12,
      change: 3,
      trend: 'up'
    },
    capacity: {
      percentage: 85,
      status: 'high-demand',
      change: 8
    },
    checkins: {
      completed: 8,
      pending: 4
    },
    available: {
      spots: 15,
      total: 20
    }
  };

  const alerts = [
    {
      type: 'capacity',
      severity: 'warning',
      title: 'Thursday & Friday approaching 95% capacity',
      actions: ['Adjust pricing', 'Add overflow kennel', 'Waitlist'],
      impact: 'High'
    },
    {
      type: 'conflict',
      severity: 'warning',
      title: '3 large dogs booked for same daycare time (space conflict)',
      actions: ['Optimize schedule', 'Contact customer'],
      impact: 'Medium'
    },
    {
      type: 'opportunity',
      severity: 'info',
      title: 'Weekend fully booked - consider raising prices',
      actions: ['Enable dynamic pricing +$10'],
      impact: 'Revenue'
    }
  ];

  const getCapacityColor = (percentage) => {
    if (percentage >= 95) return 'text-red-600 bg-red-100';
    if (percentage >= 90) return 'text-orange-600 bg-orange-100';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Today's Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">📊 TODAY'S DASHBOARD</h2>
            <p className="text-sm text-blue-700">{format(currentDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">4</div>
            <div className="text-xs text-blue-600">Active Alerts</div>
          </div>
        </div>
      </div>

      {/* Stats Cards with Action Buttons */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.bookings.today}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +{stats.bookings.change} from yesterday
                </p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            View List
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCapacityColor(stats.capacity.percentage)}`}>
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Capacity</p>
                <p className={`text-2xl font-bold ${stats.capacity.percentage >= 90 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {stats.capacity.percentage}%
                </p>
                <p className="text-xs text-gray-600">
                  {stats.capacity.status === 'high-demand' ? '⚠️ High demand' : 'Week-over-week'}
                </p>
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
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Check-ins Today</p>
                <p className="text-2xl font-bold text-gray-900">{stats.checkins.completed}</p>
                <p className="text-xs text-orange-600">
                  {stats.checkins.pending} pending
                </p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            Process
          </Button>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Available Spots</p>
                <p className="text-2xl font-bold text-gray-900">{stats.available.spots}</p>
                <p className="text-xs text-gray-600">
                  Across all kennels
                </p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            Book Now
          </Button>
        </Card>
      </div>

      {/* Capacity Alerts */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900">⚠️ CAPACITY ALERTS</h3>
        </div>

        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <div key={index} className={`border-l-4 rounded-r-lg p-4 ${getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">{alert.title}</h4>
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
                  alert.impact === 'High' ? 'bg-red-100 text-red-800' :
                  alert.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {alert.impact}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Last updated: 2 minutes ago</span>
            <Button variant="outline" size="sm">
              View All Alerts
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedStatsDashboard;
