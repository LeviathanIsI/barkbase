import { DollarSign, Calendar, Users, TrendingUp, Target, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

const QuickInsightsDashboard = () => {
  // Placeholder data until real API data is available
  const metrics = [
    {
      title: 'Revenue',
      value: 'N/A',
      change: '',
      changeType: 'neutral',
      subtitle: 'No data yet',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Bookings',
      value: 'N/A',
      change: '',
      changeType: 'neutral',
      subtitle: 'No data yet',
      icon: Calendar,
      color: 'blue'
    },
    {
      title: 'Customers',
      value: 'N/A',
      change: '',
      changeType: 'neutral',
      subtitle: 'No data yet',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Growth',
      value: 'N/A',
      change: '',
      changeType: 'neutral',
      subtitle: 'No data yet',
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  const detailedMetrics = [
    {
      title: 'Avg Booking Value',
      value: 'N/A',
      change: '',
      changeType: 'neutral',
      subtitle: 'No data yet',
      icon: Target,
      color: 'blue'
    },
    {
      title: 'Capacity',
      value: 'N/A',
      change: '',
      changeType: 'neutral',
      subtitle: 'No data yet',
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Top Service',
      value: 'N/A',
      change: '',
      changeType: 'neutral',
      subtitle: 'No data yet',
      icon: TrendingUp,
      color: 'green'
    },
    {
      title: 'No-Shows',
      value: 'N/A',
      change: '',
      changeType: 'neutral',
      subtitle: 'No data yet',
      icon: AlertTriangle,
      color: 'orange'
    }
  ];

  const trendingInsights = [
    {
      type: 'positive',
      title: 'What\'s working',
      items: [
        'No data available yet'
      ]
    },
    {
      type: 'warning',
      title: 'Needs attention',
      items: [
        'No data available yet'
      ]
    }
  ];

  const getIconColor = (color) => {
    const colors = {
      green: 'text-green-600 bg-green-100 dark:bg-surface-secondary',
      blue: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-surface-secondary',
      purple: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-surface-secondary',
      orange: 'text-orange-600 bg-orange-100 dark:bg-surface-secondary'
    };
    return colors[color] || colors.blue;
  };

  const getChangeColor = (changeType) => {
    const colors = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600 dark:text-text-secondary'
    };
    return colors[changeType] || colors.neutral;
  };

  return (
    <div className="space-y-6">
      {/* Quick Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">QUICK INSIGHTS (Last 30 Days)</h3>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-gray-50 dark:bg-surface-secondary rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getIconColor(metric.color)}`}>
                  <metric.icon className="w-4 h-4" />
                </div>
                <div className={`text-sm font-medium ${getChangeColor(metric.changeType)}`}>
                  {metric.change}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{metric.value}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-text-primary">{metric.title}</p>
                <p className="text-xs text-gray-600 dark:text-text-secondary">{metric.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
          {detailedMetrics.map((metric, index) => (
            <div key={index} className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getIconColor(metric.color)}`}>
                  <metric.icon className="w-4 h-4" />
                </div>
                <div className={`text-sm font-medium ${getChangeColor(metric.changeType)}`}>
                  {metric.change}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xl font-bold text-gray-900 dark:text-text-primary">{metric.value}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-text-primary">{metric.title}</p>
                <p className="text-xs text-gray-600 dark:text-text-secondary">{metric.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Trending Insights */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-4">TRENDING</h3>

        <div className="grid gap-6 md:grid-cols-2">
          {trendingInsights.map((section, index) => (
            <div key={index} className={`border rounded-lg p-4 ${
              section.type === 'positive' ? 'border-green-200 dark:border-green-900/30 bg-green-50 dark:bg-surface-primary' : 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {section.type === 'positive' ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
                <h4 className={`font-semibold ${
                  section.type === 'positive' ? 'text-green-900' : 'text-orange-900 dark:text-orange-300'
                }`}>
                  {section.title}
                </h4>
              </div>
              <ul className="space-y-2">
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex} className={`text-sm flex items-start gap-2 ${
                    section.type === 'positive' ? 'text-green-800' : 'text-orange-800 dark:text-orange-400'
                  }`}>
                    <span className={`mt-1 ${
                      section.type === 'positive' ? 'text-green-500' : 'text-orange-500 dark:text-orange-500'
                    }`}>
                      •
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 text-sm font-medium">
            View Detailed Recommendations →
          </button>
        </div>
      </Card>
    </div>
  );
};

export default QuickInsightsDashboard;
