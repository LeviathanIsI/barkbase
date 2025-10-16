import { Calendar, Users, Clock, DollarSign, TrendingUp, AlertTriangle, Target, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const EnhancedBookingsStats = ({ bookings, currentDate }) => {
  // Calculate comprehensive stats
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    checkedIn: bookings.filter(b => b.status === 'checked_in').length,
    revenue: bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    revenueMTD: 18450, // Mock MTD revenue
    averageValue: bookings.length > 0 ? bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0) / bookings.length : 0
  };

  // Quick insights
  const insights = [
    {
      type: 'trending',
      message: 'Weekend bookings +18% vs last month',
      icon: TrendingUp,
      color: 'green'
    },
    {
      type: 'trending',
      message: `Average booking value: $${stats.averageValue.toFixed(2)} (+$5.20)`,
      icon: TrendingUp,
      color: 'green'
    },
    {
      type: 'trending',
      message: 'Rebooking rate: 73% (↗ 8%)',
      icon: Star,
      color: 'green'
    }
  ];

  // Needs attention
  const alerts = [
    {
      message: '3 bookings missing vaccination records',
      action: 'Review Records',
      severity: 'warning'
    },
    {
      message: '2 payment failures need retry',
      action: 'Process Payments',
      severity: 'error'
    },
    {
      message: 'Thanksgiving week only 45% booked (usually 95%+)',
      action: 'Create Promo',
      severity: 'warning'
    }
  ];

  // Opportunities
  const opportunities = [
    {
      message: '12 customers haven\'t rebooked in 60+ days - Send promo',
      action: 'Send Promo'
    },
    {
      message: 'Monday-Tuesday consistently 60% full - Run discount',
      action: 'Create Discount'
    },
    {
      message: '8 customers used you once only - Follow up campaign',
      action: 'Start Campaign'
    }
  ];

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Today's Dashboard Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">📊 BOOKINGS DASHBOARD</h2>
            <p className="text-sm text-blue-700">{format(currentDate, 'EEEE, MMMM d, yyyy')}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900">{alerts.length}</div>
            <div className="text-xs text-blue-600">Needs Attention</div>
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
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12 this week
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
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Check-ins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-600">Today</p>
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
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Checked In Now</p>
                <p className="text-2xl font-bold text-gray-900">{stats.checkedIn}</p>
                <p className="text-xs text-gray-600">Currently on site</p>
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
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue (MTD)</p>
                <p className="text-2xl font-bold text-gray-900">${stats.revenueMTD.toLocaleString()}</p>
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +15% vs last month
                </p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-full">
            Reports
          </Button>
        </Card>
      </div>

      {/* Quick Insights Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">QUICK INSIGHTS</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Trending Up */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              📈 TRENDING UP
            </h4>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-green-50 border border-green-200 rounded">
                  <insight.icon className="w-4 h-4 text-green-600 mt-0.5" />
                  <span className="text-sm text-green-800">{insight.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Needs Attention */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              ⚠️ NEEDS ATTENTION
            </h4>
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={index} className={`border-l-4 rounded-r-lg p-3 ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{alert.message}</div>
                    </div>
                    <Button size="sm" variant="outline">
                      {alert.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              💡 OPPORTUNITIES
            </h4>
            <div className="space-y-3">
              {opportunities.map((opp, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">{opp.message}</div>
                    </div>
                    <Button size="sm" variant="outline">
                      {opp.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-600">
              <span>Last updated: 2 minutes ago</span>
            </div>
            <Button variant="outline" size="sm">
              Take Action
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedBookingsStats;
