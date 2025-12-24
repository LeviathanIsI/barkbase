import { TrendingUp, AlertTriangle, BarChart3, Shield, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import StyledSelect from '@/components/ui/StyledSelect';
import { useBillingUsageQuery } from '@/features/settings/api';

export default function UsageTab() {
  const { data: usageData, isLoading, error } = useBillingUsageQuery();

  // Extract data from API response
  const usage = usageData?.usage;
  const trends = usageData?.trends || [];
  const insights = usageData?.insights;

  const getUsageColor = (percentage) => {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUsageBgColor = (percentage) => {
    if (percentage < 50) return 'bg-green-50 dark:bg-green-950/20';
    if (percentage < 80) return 'bg-yellow-50 dark:bg-yellow-950/20';
    return 'bg-red-50 dark:bg-red-950/20';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading usage data...</span>
      </div>
    );
  }

  if (error || !usage) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Unable to load usage data</h3>
        <p className="text-gray-600 dark:text-text-secondary">
          Please try again later or contact support if the issue persists.
        </p>
      </div>
    );
  }

  // Calculate max for trend chart scaling
  const maxBookings = Math.max(...trends.map(t => t.bookings), 1);
  const chartMax = Math.ceil(maxBookings * 1.2); // Add 20% padding

  return (
    <div className="space-y-6">
      {/* Current Usage */}
      <Card title={`USAGE THIS MONTH (${usage.period || 'Current Period'})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bookings */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 dark:text-text-primary">Bookings</span>
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                {usage.bookings?.used || 0} / {usage.bookings?.limit === -1 ? '∞' : usage.bookings?.limit || 150}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getUsageColor(usage.bookings?.percentage || 0)}`}
                style={{ width: `${Math.min(usage.bookings?.percentage || 0, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-text-secondary">
              <span>{usage.bookings?.percentage || 0}% used</span>
              <span>Reset: {usage.resetDate || 'Next month'}</span>
            </div>
          </div>

          {/* Active Pets */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 dark:text-text-primary">Active Pets</span>
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                {usage.activePets?.used || 0} / {usage.activePets?.limit === -1 ? '∞' : usage.activePets?.limit || 100}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getUsageColor(usage.activePets?.percentage || 0)}`}
                style={{ width: `${Math.min(usage.activePets?.percentage || 0, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">
              No monthly reset (total active)
            </div>
          </div>

          {/* Storage */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 dark:text-text-primary">Storage</span>
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                {usage.storage?.used || 0} MB / {usage.storage?.limit === -1 ? '∞' : usage.storage?.limit || 100} MB
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getUsageColor(usage.storage?.percentage || 0)}`}
                style={{ width: `${Math.min(usage.storage?.percentage || 0, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">
              Photos: {usage.storage?.details?.photos || 0} MB | Documents: {usage.storage?.details?.documents || 0} MB
            </div>
          </div>

          {/* Seats */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 dark:text-text-primary">Team Seats</span>
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                {usage.seats?.used || 0} / {usage.seats?.limit === -1 ? '∞' : usage.seats?.limit || 2}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getUsageColor(usage.seats?.percentage || 0)}`}
                style={{ width: `${Math.min(usage.seats?.percentage || 0, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">
              Team members with system access
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Trends */}
      <Card title="USAGE OVER TIME" icon={<TrendingUp className="w-5 h-5" />}>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
            <BarChart3 className="w-4 h-4 inline mr-1" />
            Monthly booking trends (last 6 months)
          </p>
          
          {trends.length > 1 ? (
            <div className="flex items-end gap-2 h-32">
              {trends.map((month, index) => {
                const height = chartMax > 0 ? (month.bookings / chartMax) * 100 : 0;
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-500 dark:bg-blue-600 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 2)}%` }}
                      title={`${month.bookings} bookings`}
                    />
                    <div className="text-xs text-gray-600 dark:text-text-secondary mt-2">{month.month}</div>
                    <div className="text-xs font-medium">{month.bookings}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-text-secondary">
              <BarChart3 className="w-8 h-8 mb-2 text-gray-300 dark:text-text-tertiary" />
              <p>Not enough data yet</p>
              <p className="text-sm">Check back after your first month</p>
            </div>
          )}
        </div>

        {insights && (
          <div className="bg-blue-50 dark:bg-surface-secondary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Insights</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              {insights.busiestMonth && insights.busiestMonth.month !== 'N/A' && (
                <li>• Your busiest month was {insights.busiestMonth.month} ({insights.busiestMonth.bookings} bookings)</li>
              )}
              <li>• Average: {insights.avgBookings || 0} bookings/month</li>
              <li>
                • Trend: {insights.growthDirection === 'up' ? '↗️' : insights.growthDirection === 'down' ? '↘️' : '➡️'}{' '}
                {insights.growthPercent > 0 ? `Growing ${insights.growthPercent}%` : 
                 insights.growthPercent < 0 ? `Declining ${Math.abs(insights.growthPercent)}%` : 
                 'Stable'} month-over-month
              </li>
            </ul>
          </div>
        )}

        <div className="mt-4">
          <Button variant="outline">
            View Detailed Reports →
          </Button>
        </div>
      </Card>

      {/* Usage Alerts */}
      {(usage.bookings?.percentage >= 80 || usage.storage?.percentage >= 80 || usage.seats?.percentage >= 100) && (
        <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Usage Alerts</h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                {usage.bookings?.percentage >= 80 && (
                  <li>• You're at {usage.bookings.percentage}% of your monthly booking limit</li>
                )}
                {usage.storage?.percentage >= 80 && (
                  <li>• Storage is at {usage.storage.percentage}% capacity</li>
                )}
                {usage.seats?.percentage >= 100 && (
                  <li>• You've reached your team seat limit</li>
                )}
              </ul>
              <Button variant="outline" size="sm" className="mt-3 border-yellow-400 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/30">
                Upgrade Plan
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Overage Protection */}
      <Card title="OVERAGE SETTINGS" icon={<Shield className="w-5 h-5" />}>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-text-primary mb-2">
              What happens if I exceed my limits?
            </h3>
            <p className="text-sm text-gray-600 dark:text-text-secondary mb-4">
              Configure how the system handles usage that exceeds your plan limits.
            </p>
          </div>

          {/* Bookings Overage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary">Bookings</span>
              <div className="min-w-[200px]">
                <StyledSelect
                  options={[
                    { value: 'block', label: 'Block new bookings' },
                    { value: 'allow-with-fee', label: 'Allow with fee ($0.50/booking)' },
                    { value: 'auto-upgrade', label: 'Auto-upgrade to next plan' },
                  ]}
                  value="block"
                  onChange={() => {}}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            </div>
            <p className="text-xs text-text-tertiary">
              Current setting: Block new bookings when limit is reached
            </p>
          </div>

          {/* Storage Overage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary">Storage</span>
              <div className="min-w-[180px]">
                <StyledSelect
                  options={[
                    { value: 'block-uploads', label: 'Block uploads' },
                    { value: 'auto-upgrade', label: 'Auto-upgrade storage' },
                    { value: 'read-only', label: 'Read-only mode' },
                  ]}
                  value="read-only"
                  onChange={() => {}}
                  isClearable={false}
                  isSearchable={false}
                />
              </div>
            </div>
            <p className="text-xs text-text-tertiary">
              Current setting: Read-only mode when storage limit is reached
            </p>
          </div>

          {/* Warning Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary">Email me when I reach</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  defaultValue={80}
                  className="w-16 rounded-lg border border-border bg-surface-primary px-2 py-2 text-sm text-center text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  min="1"
                  max="100"
                />
                <span className="text-sm text-text-secondary">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-text-secondary">
              Get notified before hitting limits to avoid service interruptions
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-surface-border">
            <Button>
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
