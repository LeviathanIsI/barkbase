import { DollarSign, Calendar, Users, BarChart3, TrendingUp, Target } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const LiveAnalyticsDashboard = () => {
  const todaysSnapshot = [
    {
      title: 'Today\'s Revenue',
      value: '$1,247',
      target: '$850',
      change: '+47%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Check-ins',
      value: '8',
      subtitle: 'On schedule',
      icon: Calendar,
      color: 'blue'
    },
    {
      title: 'Check-outs',
      value: '6',
      subtitle: '2 pending',
      icon: Users,
      color: 'orange'
    },
    {
      title: 'Current Occupancy',
      value: '73%',
      subtitle: '25/34 full',
      icon: BarChart3,
      color: 'purple'
    }
  ];

  const weeklyMetrics = {
    revenue: '$6,340',
    avgDaily: '$905.71',
    bestDay: 'Sat ($1,247)',
    bookings: 89,
    avgBooking: '$71.24'
  };

  const servicePerformance = [
    { service: 'Boarding', percentage: 62, color: 'bg-green-50 dark:bg-green-950/20' },
    { service: 'Daycare', percentage: 27, color: 'bg-blue-50 dark:bg-blue-950/20' },
    { service: 'Grooming', percentage: 9, color: 'bg-orange-500' },
    { service: 'Training', percentage: 2, color: 'bg-purple-500' }
  ];

  const capacityData = [
    { day: 'Mon', utilization: 52 },
    { day: 'Tue', utilization: 65 },
    { day: 'Wed', utilization: 68 },
    { day: 'Thu', utilization: 82 },
    { day: 'Fri', utilization: 95 },
    { day: 'Sat', utilization: 88 },
    { day: 'Sun', utilization: 72 }
  ];

  const proFeatures = [
    'Real-time profit margins',
    'Customer acquisition cost',
    'Lifetime value tracking',
    'Predictive revenue forecasting',
    'Staff productivity metrics',
    'Custom KPI dashboards'
  ];

  const getIconColor = (color) => {
    const colors = {
      green: 'text-green-600 bg-green-100 dark:bg-surface-secondary',
      blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-surface-secondary',
      orange: 'text-orange-600 bg-orange-100 dark:bg-surface-secondary',
      purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-surface-secondary'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Today's Snapshot */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-6">TODAY'S SNAPSHOT</h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {todaysSnapshot.map((metric, index) => (
            <div key={index} className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconColor(metric.color)}`}>
                  <metric.icon className="w-5 h-5" />
                </div>
                {metric.change && (
                  <span className={`text-sm font-semibold ${
                    metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{metric.value}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-text-primary">{metric.title}</p>
                {metric.target && (
                  <p className="text-xs text-gray-600 dark:text-text-secondary">Target: {metric.target} ✅</p>
                )}
                {metric.subtitle && (
                  <p className="text-xs text-gray-600 dark:text-text-secondary">{metric.subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Key Metrics (Last 7 Days) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">KEY METRICS (Last 7 Days)</h3>
          <select className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm bg-white dark:bg-surface-primary">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
        </div>

        {/* Revenue Trend Chart */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-2">Revenue Trend</h4>
          <div className="h-32 bg-gray-50 dark:bg-surface-secondary rounded flex items-end justify-center">
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-gray-600 dark:text-text-secondary text-sm">Revenue trend visualization</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <div className="flex gap-4">
              <span>Total: <strong>{weeklyMetrics.revenue}</strong></span>
              <span>Avg/day: <strong>{weeklyMetrics.avgDaily}</strong></span>
              <span>Best: <strong>{weeklyMetrics.bestDay}</strong></span>
            </div>
          </div>
        </div>

        {/* Service Performance */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-3">SERVICE PERFORMANCE</h4>
          <div className="space-y-3">
            {servicePerformance.map((service, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600 dark:text-text-secondary">{service.service}</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${service.color}`}
                      style={{ width: `${service.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-12 text-sm font-medium text-right">{service.percentage}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Capacity Utilization */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-text-primary mb-3">CAPACITY UTILIZATION</h4>
          <div className="grid grid-cols-7 gap-2 mb-3">
            {capacityData.map((day, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-600 dark:text-text-secondary mb-1">{day.day}</div>
                <div className="relative">
                  <div className="w-full bg-gray-200 dark:bg-surface-border rounded h-16 flex items-end justify-center">
                    <div
                      className={`w-full rounded-b ${
                        day.utilization >= 90 ? 'bg-red-50 dark:bg-red-950/20' :
                        day.utilization >= 80 ? 'bg-orange-500' :
                        day.utilization >= 60 ? 'bg-yellow-50 dark:bg-yellow-950/20' : 'bg-green-50 dark:bg-green-950/20'
                      }`}
                      style={{ height: `${day.utilization}%` }}
                    ></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white">{day.utilization}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-text-secondary">
            <span>Average: <strong>73%</strong></span>
            <span>Peak: <strong>95% (Friday)</strong></span>
            <span>Low: <strong>52% (Monday)</strong></span>
          </div>
          <div className="mt-2 p-3 bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Monday-Tuesday underutilized</strong> - Opportunity for promotion
            </p>
          </div>
        </div>
      </Card>

      {/* PRO Features Upsell */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-surface-primary dark:to-surface-primary border-purple-200 dark:border-purple-900/30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Target className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xl font-semibold text-purple-900 dark:text-purple-100">UNLOCK PRO ANALYTICS</h3>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mb-6 text-left">
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                <span className="text-sm text-purple-800 dark:text-purple-200">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button>
              Upgrade to PRO
            </Button>
            <Button variant="outline">
              See Full Pro Features
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LiveAnalyticsDashboard;
