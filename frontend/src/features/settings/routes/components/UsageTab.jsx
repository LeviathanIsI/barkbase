import { TrendingUp, AlertTriangle, BarChart3, Shield } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function UsageTab() {
  // Mock usage data - replace with API calls
  const currentUsage = {
    period: 'Jan 1-15, 2025',
    bookings: { used: 0, limit: 150, percentage: 0 },
    activePets: { used: 45, limit: 100, percentage: 45 },
    storage: { used: 25, limit: 100, percentage: 25, details: { photos: 18, documents: 7 } },
    seats: { used: 0, limit: 2, percentage: 0 }
  };

  const usageTrends = [
    { month: 'Aug', bookings: 67 },
    { month: 'Sep', bookings: 73 },
    { month: 'Oct', bookings: 89 },
    { month: 'Nov', bookings: 95 },
    { month: 'Dec', bookings: 112 },
    { month: 'Jan', bookings: 47 }
  ];

  const overageSettings = {
    bookings: 'block', // block, allow-with-fee, auto-upgrade
    storage: 'read-only', // block-uploads, auto-upgrade, read-only
    warningThreshold: 80
  };

  const getUsageColor = (percentage) => {
    if (percentage < 50) return 'bg-green-50 dark:bg-green-950/20';
    if (percentage < 80) return 'bg-yellow-50 dark:bg-yellow-950/20';
    return 'bg-red-50 dark:bg-red-950/20';
  };

  const getUsageStatus = (percentage) => {
    if (percentage < 50) return 'text-green-700';
    if (percentage < 80) return 'text-yellow-700';
    return 'text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* Current Usage */}
      <Card title={`USAGE THIS MONTH (${currentUsage.period})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bookings */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 dark:text-text-primary">Bookings</span>
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                {currentUsage.bookings.used} / {currentUsage.bookings.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getUsageColor(currentUsage.bookings.percentage)}`}
                style={{ width: `${currentUsage.bookings.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-text-secondary">
              <span>0%</span>
              <span>Reset date: Feb 1, 2025</span>
            </div>
          </div>

          {/* Active Pets */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 dark:text-text-primary">Active Pets</span>
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                {currentUsage.activePets.used} / {currentUsage.activePets.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getUsageColor(currentUsage.activePets.percentage)}`}
                style={{ width: `${currentUsage.activePets.percentage}%` }}
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
                {currentUsage.storage.used} MB / {currentUsage.storage.limit} MB
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getUsageColor(currentUsage.storage.percentage)}`}
                style={{ width: `${currentUsage.storage.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">
              Photos: {currentUsage.storage.details.photos} MB | Documents: {currentUsage.storage.details.documents} MB
            </div>
          </div>

          {/* Seats */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-900 dark:text-text-primary">Seats</span>
              <span className="text-sm text-gray-600 dark:text-text-secondary">
                {currentUsage.seats.used} / {currentUsage.seats.limit}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3">
              <div
                className={`h-3 rounded-full ${getUsageColor(currentUsage.seats.percentage)}`}
                style={{ width: `${currentUsage.seats.percentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-text-secondary">
              Team members with system access
            </div>
          </div>
        </div>
      </Card>

      {/* Usage Trends */}
      <Card title="USAGE OVER TIME" icon={TrendingUp}>
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-text-secondary mb-2">
            <BarChart3 className="w-4 h-4 inline mr-1" />
            Monthly booking trends
          </p>
          <div className="flex items-end gap-2 h-32">
            {usageTrends.map((month, index) => {
              const height = (month.bookings / 120) * 100; // Max 120 for scaling
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-50 dark:bg-blue-950/20 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs text-gray-600 dark:text-text-secondary mt-2">{month.month}</div>
                  <div className="text-xs font-medium">{month.bookings}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Insights</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Your busiest month was December (112 bookings)</li>
            <li>• Average: 67 bookings/month</li>
            <li>• Trend: ↗️ Growing 15% month-over-month</li>
          </ul>
        </div>

        <div className="mt-4">
          <Button variant="outline">
            View Detailed Reports →
          </Button>
        </div>
      </Card>

      {/* Overage Protection */}
      <Card title="OVERAGE SETTINGS" icon={Shield}>
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
              <span className="font-medium text-gray-900 dark:text-text-primary">Bookings</span>
              <select
                value={overageSettings.bookings}
                onChange={() => {}}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              >
                <option value="block">Block new bookings</option>
                <option value="allow-with-fee">Allow with fee ($0.50/booking)</option>
                <option value="auto-upgrade">Auto-upgrade to next plan</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-text-secondary">
              Current setting: Block new bookings when limit is reached
            </p>
          </div>

          {/* Storage Overage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-text-primary">Storage</span>
              <select
                value={overageSettings.storage}
                onChange={() => {}}
                className="px-3 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm"
              >
                <option value="block-uploads">Block uploads</option>
                <option value="auto-upgrade">Auto-upgrade storage</option>
                <option value="read-only">Read-only mode</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 dark:text-text-secondary">
              Current setting: Read-only mode when storage limit is reached
            </p>
          </div>

          {/* Warning Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900 dark:text-text-primary">Email me when I reach</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={overageSettings.warningThreshold}
                  onChange={() => {}}
                  className="w-16 px-2 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm text-center"
                  min="1"
                  max="100"
                />
                <span className="text-sm text-gray-600 dark:text-text-secondary">%</span>
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
