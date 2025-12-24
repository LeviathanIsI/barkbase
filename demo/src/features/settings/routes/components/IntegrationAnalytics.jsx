import { BarChart3, Activity, Clock, TrendingUp } from 'lucide-react';

const IntegrationAnalytics = () => {
  return (
    <div className="bg-primary-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Integration Insights</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">Connected Integrations</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-text-primary">4</div>
        </div>

        <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">Events Synced (30 days)</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-text-primary">8,943</div>
        </div>

        <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-text-primary">99.7%</div>
        </div>

        <div className="bg-white dark:bg-surface-primary rounded-lg p-4 border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-text-secondary">Time Saved</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-text-primary">47h</div>
          <div className="text-xs text-gray-600 dark:text-text-secondary">this month</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="text-blue-700 dark:text-blue-300">
          <span className="font-medium">Most Active:</span> QuickBooks (3,456 events)
        </div>
        <div className="text-green-700">
          <span className="font-medium">Most Valuable:</span> VetVerify (saves 15h/month)
        </div>
        <div className="text-center">
          <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">View Full Analytics Report</a>
        </div>
      </div>
    </div>
  );
};

export default IntegrationAnalytics;
