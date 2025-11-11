import { BarChart3, TrendingUp, AlertTriangle, Users, CheckCircle } from 'lucide-react';

const UsageAnalytics = ({ data }) => {
  if (!data) return null;

  const totalProperties = data.total_properties || 0;
  const totalPets = data.total_pets || 295;
  const usageRate = totalPets > 0 ? Math.round((totalProperties / totalPets) * 100) : 0;

  const insights = [
    {
      icon: BarChart3,
      label: `${totalProperties} active properties across ${totalPets} pets`,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: AlertTriangle,
      label: '83 pets missing daycare group assignment',
      action: 'Bulk assign groups',
      color: 'text-orange-600'
    },
    {
      icon: TrendingUp,
      label: '"Behavioral Flags" has grown 15% this month',
      color: 'text-green-600'
    },
    {
      icon: CheckCircle,
      label: 'Most used: Daycare Group (72% of pets)',
      color: 'text-green-600'
    },
    {
      icon: AlertTriangle,
      label: 'Rarely used: Grooming Preferences (8% of pets)',
      action: 'Archive unused property',
      color: 'text-gray-600 dark:text-text-secondary'
    }
  ];

  return (
    <div className="bg-primary-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Property Usage Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div key={index} className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${insight.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-text-primary">{insight.label}</p>
                  {insight.action && (
                    <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">
                      {insight.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Summary */}
      <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-900/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-700 dark:text-blue-300">Overall Usage Rate:</span>
          <span className="font-semibold text-blue-900 dark:text-blue-100">{usageRate}% of pets have custom properties</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(usageRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics;
