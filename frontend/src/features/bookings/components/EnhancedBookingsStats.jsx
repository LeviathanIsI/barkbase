import { Calendar, Users, Clock, DollarSign, TrendingUp, AlertTriangle, Target, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useBookingsInsightsQuery } from '../../settings/api';

const EnhancedBookingsStats = ({ bookings, currentDate }) => {
  // Real insights data
  const { data: insightsData, isLoading: insightsLoading } = useBookingsInsightsQuery();

  // Calculate comprehensive stats from real bookings
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length,
    checkedIn: bookings.filter(b => b.status === 'checked_in').length,
    revenue: bookings.reduce((sum, b) => sum + (b.totalCents || 0), 0) / 100, // Convert cents to dollars
    revenueMTD: insightsData?.revenueToday || 0, // Use real MTD from API
    averageValue: bookings.length > 0 ? (bookings.reduce((sum, b) => sum + (b.totalCents || 0), 0) / bookings.length) / 100 : 0
  };

  // Generate insights from real data
  const insights = insightsLoading ? [] : [
    stats.total > 0 ? {
      type: 'info',
      message: `Total bookings: ${stats.total}`,
      icon: Calendar,
      color: 'blue'
    } : null,
    stats.averageValue > 0 ? {
      type: 'info',
      message: `Average booking value: $${stats.averageValue.toFixed(2)}`,
      icon: DollarSign,
      color: 'blue'
    } : null,
    stats.revenue > 0 ? {
      type: 'info',
      message: `Total revenue: $${stats.revenue.toFixed(2)}`,
      icon: TrendingUp,
      color: 'green'
    } : null
  ].filter(Boolean);

  // Generate alerts based on real data patterns
  const alerts = [];
  if (stats.pending > 0) {
    alerts.push({
      message: `${stats.pending} bookings pending check-in`,
      action: 'Process Check-ins',
      severity: 'warning'
    });
  }

  // Generate recommendations based on data patterns
  const opportunities = insightsLoading ? [] : [
    stats.pending > 0 ? {
      message: 'Process pending check-ins to improve capacity utilization',
      action: 'View Pending'
    } : null,
    stats.total > 5 ? {
      message: 'Review booking patterns for optimization opportunities',
      action: 'View Analytics'
    } : null
  ].filter(Boolean);

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
                <p className="text-xs text-gray-600">
                  This week
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
                <p className="text-2xl font-bold text-gray-900">${stats.revenue.toFixed(2)}</p>
                <p className="text-xs text-gray-600">
                  Month to date
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
          <h3 className="text-lg font-semibold text-gray-900">CURRENT STATS</h3>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Current Metrics */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              📊 CURRENT METRICS
            </h4>
            <div className="space-y-3">
              {insights.length > 0 ? insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <insight.icon className="w-4 h-4 text-blue-600 mt-0.5" />
                  <span className="text-sm text-blue-800">{insight.message}</span>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No current metrics available
                </div>
              )}
            </div>
          </div>

          {/* Action Items */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              📋 ACTION ITEMS
            </h4>
            <div className="space-y-3">
              {alerts.length > 0 ? alerts.map((alert, index) => (
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
              )) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No action items needed
                </div>
              )}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              💡 RECOMMENDATIONS
            </h4>
            <div className="space-y-3">
              {opportunities.length > 0 ? opportunities.map((opp, index) => (
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
              )) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No recommendations available
                </div>
              )}
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
